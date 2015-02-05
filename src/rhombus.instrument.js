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

    // TODO: put this on the Rhombus object
    function Instrument(type, options, id) {
      var ctr = typeMap[type];
      if (ctr === null || ctr === undefined) {
        type = "mono";
        ctr = mono;
      }

      if (id === undefined || id === null) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      this._type = type;
      this._currentParams = {};
      this._trackParams(options);

      var unnormalized = unnormalizedParams(options, this._type);
      Tone.PolySynth.call(this, undefined, ctr, unnormalized);

      // TODO: don't route everything to master
      this.toMaster();
      this._triggered = {};
    }
    Tone.extend(Instrument, Tone.PolySynth);

    r.addInstrument = function(type, options, id) {
      var instr = new Instrument(type, options, id);

      if (instr === null || instr === undefined) {
        return;
      }

      r._song._instruments[instr._id] = instr;
      return instr._id;
    };

    function inToId(instrOrId) {
      var id;
      if (typeof instrOrId === "object") {
        id = instrOrId._id;
      } else {
        id = +id;
      }
      return id;
    }

    r.removeInstrument = function(instrOrId) {
      var id = inToId(instrOrId);
      if (id < 0) {
        return;
      }

      delete r._song._instruments[id];
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

    Instrument.prototype._trackParams = function(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    };

    Instrument.prototype.toJSON = function() {
      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams
      };
      return jsonVersion;
    };

    // Frequently used mappings.
    // TODO: fix envelope function mappings
    var timeMapFn = Rhombus._map.mapExp(0.0001, 60);
    var freqMapFn = Rhombus._map.mapExp(1, 22100);
    var lowFreqMapFn = Rhombus._map.mapExp(1, 100);
    var exponentMapFn = Rhombus._map.mapExp(0.01, 10);
    var harmMapFn = Rhombus._map.mapLinear(-1000, 1000);

    var envelopeMap = {
      "attack" : timeMapFn,
      "decay" : timeMapFn,
      "sustain" : timeMapFn,
      "release" : timeMapFn,
      "exponent" : exponentMapFn
    };

    var filterMap = {
      "type" : Rhombus._map.mapDiscrete("lowpass", "highpass", "bandpass", "lowshelf",
                           "highshelp", "peaking", "notch", "allpass"),
      "frequency" : freqMapFn,
      "rolloff" : Rhombus._map.mapDiscrete(-12, -24, -48),
      // TODO: verify this is good
      "Q" : Rhombus._map.mapLinear(1, 15),
      // TODO: verify this is good
      "gain" : Rhombus._map.mapIdentity
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
      "portamento" : Rhombus._map.mapLinear(0, 10),
      // TODO: verify this is good
      "volume" : Rhombus._map.mapLog(-96.32, 0)
    };

    var monoSynthMap = {
      "oscillator" : {
        "type" : Rhombus._map.mapDiscrete("sine", "square", "triangle", "sawtooth", "pulse", "pwm")
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
        "modulationIndex" : Rhombus._map.mapLinear(-5, 5),
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "noise" : {
        "noise" : {
          "type" : Rhombus._map.mapDiscrete("white", "pink", "brown")
        },
        "envelope" : envelopeMap,
        "filter" : filterMap,
        "filterEnvelope" : filterEnvelopeMap,
      },

      "samp" : {
        // TODO: anything here?
      },

      "duo" : {
        "vibratoAmount" : Rhombus._map.mapLinear(0, 20),
        "vibratoRate" : freqMapFn,
        "vibratoDelay" : timeMapFn,
        "harmonicity" : harmMapFn,
        "voice0" : monoSynthMap,
        "voice1" : monoSynthMap
      }
    };

    Instrument.prototype.normalizedSet = function(params) {
      this._trackParams(params);
      var unnormalized = Rhombus._map.unnormalizedParams(params, this._type, globalMaps, unnormalizeMaps);
      this.set(unnormalized);
    };

    // HACK: these are here until proper note routing is implemented
    var instrId = r.addInstrument("mono");
    r.Instrument = r._song._instruments[instrId];
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
      var keys = Object.keys(r._song._instruments);
      if (keys.length === 0) {
        return;
      }

      if (previewNote === undefined) {
        previewNote = new Note(pitch, 0);
        r._song._instruments[keys[0]].triggerAttack(previewNote._id, pitch, 0);
      }
    };

    r.stopPreviewNote = function() {
      var keys = Object.keys(r._song._instruments);
      if (keys.length === 0) {
        return;
      }

      if (previewNote !== undefined) {
        r._song._instruments[keys[0]].triggerRelease(previewNote._id, 0);
        previewNote = undefined;
      }
    };
  };
})(this.Rhombus);
