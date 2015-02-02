//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

    var mono = Tone.MonoSynth;
    var am = Tone.AMSynth;
    var fm = Tone.FMSynth;
    var noise = Tone.NoiseSynth;
    var samp = Tone.MultiSampler;
    var duo = Tone.DuoSynth;
    var typeMap = {
      "mono" : mono,
      "am"   : am,
      "fm"   : fm,
      "noise": noise,
      "samp" : samp,
      "duo"  : duo
    };

    function Instrument(type, options) {
      var ctr = typeMap[type];
      if (ctr === null || ctr === undefined) {
        ctr = mono;
      }

      r._newId(this);

      this._type = type;
      var unnormalized = unnormalizedParams(options, this._type);
      Tone.PolySynth.call(this, undefined, ctr, unnormalized);

      // TODO: don't route everything to master
      this.toMaster();
      this._triggered = {};
    }
    Tone.extend(Instrument, Tone.PolySynth);

    r._song.instruments = {};
    r.addInstrument = function(type, options) {
      instr = new Instrument(type, options);

      if (instr === null || instr === undefined) {
        return;
      }

      r._song.instruments[instr._id] = instr;
      return instr._id;
    };

    function inToId(instrOrId) {
      var id;
      if (typeof instrOrId === "object") {
        id = instrOrId._id;
      } else {
        id = +id;
      }
      return index;
    }

    r.removeInstrument = function(instrOrId) {
      var id = inToId(instrOrId);
      if (id < 0) {
        return;
      }

      delete r._song.instruments[id];
    };

    Instrument.prototype.triggerAttack = function(id, pitch, delay) {
      // Don't play out-of-range notes
      if (pitch < 0 || pitch > 127) {
        return;
      }
      var tA = Tone.PolySynth.prototype.triggerAttack;

      var freq = Rhombus.Util.noteNum2Freq(pitch);
      this._triggered[id] = freq;

      if (delay > 0) {
        tA.call(this, freq, "+" + delay);
      } else {
        tA.call(this, freq);
      }
    };

    Instrument.prototype.triggerRelease = function(id, delay) {
      var tR = Tone.PolySynth.prototype.triggerRelease;
      var freq = this._triggered[id];
      if (delay > 0) {
        tR.call(this, freq, "+" + delay);
      } else {
        tR.call(this, freq);
      }
    };

    Instrument.prototype.killAllNotes = function() {
      var freqs = [];
      for (var id in this._triggered) {
        freqs.push(this._triggered[id]);
      }
      Tone.PolySynth.prototype.triggerRelease.call(this, freqs);
      this._triggered = {};
    };

    // Common mapping styles.
    // mapIdentity: maps x to x.
    function mapIdentity(x) {
      return x;
    }
    // mapLinear(x, y): maps [0,1] linearly to [x,y].
    function mapLinear(x, y) {
      function mapper(t) {
        return x + t*(y-x);
      }
      return mapper;
    }
    // mapExp(x, y): maps [0,1] exponentially to [x,y].
    // x, y should both be strictly positive.
    function mapExp(x, y) {
      var c0 = x;
      var c1 = Math.log(y / x);
      function mapper(t) {
        return c0*Math.exp(c1*t);
      }
      return mapper;
    }
    // mapLog(x, y): maps [0,1] logarithmically to [x,y].
    // Really, it maps [smallvalue, 1] logarithmically to [x,y]
    // because log functions aren't defined at 0.
    function mapLog(x, y) {
      var threshold = 0.0001;
      var logc1, c1, c0;
      if (y === 0) {
        c1 = 1;
        c0 = x / Math.log(threshold);
      } else {
        logc1 = Math.log(threshold) / ((x/y) - 1);
        c1 = Math.exp(logc1);
        c0 = y / logc1;
      }

      function mapper(t) {
        if (t < threshold) {
          t = threshold;
        }
        return c0*Math.log(c1*t);
      }
      return mapper;
    }
    // mapDiscrete(arg1, ...): divides [0,1] into equal-sized
    // boxes, with each box mapping to an argument.
    function mapDiscrete() {
      var maxIdx = arguments.length-1;
      var binSize = 1.0 / arguments.length;
      var args = arguments;
      function mapper(t) {
        var idx = Math.floor(t / binSize);
        if (idx >= maxIdx) {
          idx = maxIdx;
        }
        return args[idx];
      }
      return mapper;
    }

    // Frequently used mappings.
    // TODO: fix envelope function mappings
    var timeMapFn = mapExp(0.0001, 60);
    var freqMapFn = mapExp(1, 22100);
    var lowFreqMapFn = mapExp(1, 100);
    var exponentMapFn = mapExp(0.01, 10);
    var harmMapFn = mapLinear(-1000, 1000);

    var envelopeMap = {
      "attack" : timeMapFn,
      "decay" : timeMapFn,
      "sustain" : timeMapFn,
      "release" : timeMapFn,
      "exponent" : exponentMapFn
    };

    var filterMap = {
      "type" : mapDiscrete("lowpass", "highpass", "bandpass", "lowshelf",
                           "highshelp", "peaking", "notch", "allpass"),
      "frequency" : freqMapFn,
      "rolloff" : mapDiscrete(-12, -24, -48),
      // TODO: verify this is good
      "Q" : mapLinear(1, 15),
      // TODO: verify this is good
      "gain" : mapIdentity
    };

    var filterEnvelopeMap = {
      "attack" : timeMapFn,
      "decay" : timeMapFn,
      // TODO: fix this
      "sustain" : timeMapFn,
      "release" : timeMapFn,
      "min" : freqMapFn,
      "max" : freqMapFn,
      "exponent" : exponentMapFn
    };

    // These mappings apply to all instruments
    // at any level in a params object.
    var globalMaps = {
      "portamento" : mapLinear(0, 10),
      // TODO: verify this is good
      "volume" : mapLog(-96.32, 0)
    };

    var monoSynthMap = {
      "oscillator" : {
        "type" : mapDiscrete("sine", "square", "triangle", "sawtooth", "pulse", "pwm")
      },
      "envelope" : envelopeMap,
      "filter" : filterMap,
      "filterEnvelope" : filterEnvelopeMap,
      "detune" : harmMapFn
    };

    var unnormalizeMaps = {
      "mono" : monoSynthMap,

      "am" : {
        // TODO: verify this is good
        "harmonicity" : harmMapFn,
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "fm" : {
        // TODO: verify this is good
        "harmonicity" : harmMapFn,
        // TODO: verify this is good
        "modulationIndex" : mapLinear(-5, 5),
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "noise" : {
        "noise" : {
          "type" : mapDiscrete("white", "pink", "brown")
        },
        "envelope" : envelopeMap,
        "filter" : filterMap,
        "filterEnvelope" : filterEnvelopeMap,
      },

      "samp" : {
        // TODO: anything here?
      },

      "duo" : {
        "vibratoAmount" : mapLinear(0, 20),
        "vibratoRate" : freqMapFn,
        "vibratoDelay" : timeMapFn,
        "harmonicity" : harmMapFn,
        "voice0" : monoSynthMap,
        "voice1" : monoSynthMap
      }
    };

    function unnormalizedParams(params, type) {
      if (params === undefined || params === null ||
          typeof(params) !== "object") {
        return params;
      }

      function unnormalized(obj, thisLevelMap) {
        var returnObj = {};
        var keys = Object.keys(obj);
        for (var idx in keys) {
          var key = keys[idx];
          var value = obj[key];
          if (typeof(value) === "object") {
            var nextLevelMap = thisLevelMap[key];
            returnObj[key] = unnormalized(value, nextLevelMap);
          } else {
            var globalXformer = globalMaps[key];
            var ctrXformer = thisLevelMap != undefined ? thisLevelMap[key] : undefined;
            if (globalXformer !== undefined) {
              returnObj[key] = globalXformer(value);
            } else if (ctrXformer !== undefined) {
              returnObj[key] = ctrXformer(value);
            } else {
              returnObj[key] = value;
            }
          }
        }
        return returnObj;
      }

      return unnormalized(params, unnormalizeMaps[type]);
    }

    Instrument.prototype.normalizedSet = function(params) {
      var unnormalized = unnormalizedParams(params, this._type);
      this.set(unnormalized);
    };

    // HACK: these are here until proper note routing is implemented
    var instrId = r.addInstrument("mono");
    r.Instrument = r._song.instruments[instrId];
    r.Instrument.normalizedSet({ volume: 0.1 });
    // HACK: end

    // only one preview note is allowed at a time
    var previewNote = undefined;

    r.setFilterCutoff = function(cutoff) {
      var normalizedCutoff = cutoff / 127;
      r.Instrument.normalizedSet({
        filter: {
          frequency: normalizedCutoff
        }
      });
      console.log(" - trying to set filter cutoff to " + cutoff);
    };

    r.startPreviewNote = function(pitch) {
      var keys = Object.keys(r._song.instruments);
      if (keys.length === 0) {
        return;
      }

      if (previewNote === undefined) {
        previewNote = new Note(pitch, 0);
        r._song.instruments[keys[0]].triggerAttack(previewNote._id, pitch, 0);
      }
    };

    r.stopPreviewNote = function() {
      var keys = Object.keys(r._song.instruments);
      if (keys.length === 0) {
        return;
      }

      if (previewNote !== undefined) {
        r._song.instruments[keys[0]].triggerRelease(previewNote._id, 0);
        previewNote = undefined;
      }
    };
  };
})(this.Rhombus);
