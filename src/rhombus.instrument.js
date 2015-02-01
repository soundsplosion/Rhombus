//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

    var mono = Tone.MonoSynth;
    var am = Tone.AMSynth;
    var fm = Tone.FMSynth;
    var pluck = Tone.PluckSynth;
    var noise = Tone.NoiseSynth;
    var samp = Tone.MultiSampler;
    var duo = Tone.DuoSynth;
    var typeMap = {
      "mono" : mono,
      "am"   : am,
      "fm"   : fm,
      "pluck": pluck,
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

      this._ctr = ctr;
      Tone.PolySynth.call(this, null, ctr);

      this.toMaster();
      this._triggered = {};
    }
    Tone.extend(Instrument, Tone.PolySynth);

    r.addInstrument = function(type, options) {
      instr = new Instrument(type, options);

      if (instr === null || instr === undefined) {
        return;
      }

      r._song.instruments[instr._id] = instr;
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
      var logc1 = Math.log(threshold) / ((x/y) - 1);
      var c1 = Math.exp(logc1);
      var c0 = y / logc1;
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
    var timeMapFn = mapExp(0.0001, 60);
    var freqMapFn = mapExp(1, 22100);
    var lowFreqMapFn = mapExp(1, 100);
    var exponentMapFn = mapExp(0.01, 10);
    var harmMapFn = mapLinear(-5, 5);

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
      "volume" : mapLog(-10000, 12.04)
    };

    var monoSynthMap = {
      "oscillator" : {
        "type" : mapDiscrete("sine", "square", "triangle", "sawtooth", "pulse", "pwm")
      },
      "envelope" : envelopeMap,
      "filter" : filterMap,
      "filterEnvelope" : filterEnvelopeMap,
      // TODO: verify this is good
      "detune" : harmMapFn
    };

    var normalizeMaps = {
      mono : monoSynthMap,

      am : {
        // TODO: verify this is good
        "harmonicity" : harmMapFn,
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      fm : {
        // TODO: verify this is good
        "harmonicity" : harmMapFn,
        // TODO: verify this is good
        "modulationIndex" : mapLinear(-5, 5),
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      pluck : {
        "attackNoise" : mapExp(0.1, 20),
        "dampening" : freqMapFn,
        // TODO: verify this is good (that is, verify 0,1 should be excluded)
        "resonance" : mapLinear(0.001, 0.999)
      },

      noise : {
        "noise" : {
          "type" : mapDiscrete("white", "pink", "brown")
        },
        "envelope" : envelopeMap,
        "filter" : filterMap,
        "filterEnvelope" : filterEnvelopeMap,
      },

      samp : {
        // TODO: anything here?
      },

      duo : {
        // TODO: verify this is good
        "vibratoAmount" : mapIdentity,
        "vibratoRate" : freqMapFn,
        "vibratoDelay" : timeMapFn,
        "harmonicity" : harmMapFn,
        "voice0" : monoSynthMap,
        "voice1" : monoSynthMap
      }
    };

    Instrument.prototype.normalizedSet = function(params) {
      var ctrMaps = normalizeMaps[this._ctr];

      function transform(params) {
        var keys = Object.keys(params);
        for (var key in keys) {
          var value = params[key];
          if (typeof(value) === "object") {
            transform(value);
          } else {
            var globalXformer = globalMaps[key];
            var ctrXformer = ctrMaps[key];
            if (globalXformer !== undefined) {
              params[key] = globalXformer(value);
            } else if (ctrXformer !== undefined) {
              params[key] = ctrXformer(value);
            }
          }
        }
      }

      transform(params);
      this.set(params);
    };

    // only one preview note is allowed at a time
    var previewNote = undefined;

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
