//! rhombus.instrument.tone.js
//! authors: Spencer Phippen, Tim Grant
//!
//! Contains instrument definitions for instruments wrapped from Tone.
//!
//! license: MIT

(function(Rhombus) {
  Rhombus._wrappedInstrumentSetup = function(r) {

    var mono = Tone.MonoSynth;
    var am = Tone.AMSynth;
    var fm = Tone.FMSynth;
    var noise = Tone.NoiseSynth;
    var duo = Tone.DuoSynth;
    var typeMap = {
      "mono" : mono,
      "am"   : am,
      "fm"   : fm,
      "noise": noise,
      "duo"  : duo
    };

    function ToneInstrument(type, options, id) {
      var ctr = typeMap[type];
      if (isNull(ctr) || notDefined(ctr)) {
        type = "mono";
        ctr = mono;
      }

      if (notDefined(id)) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      this._type = type;
      this._unnormalizeMap = unnormalizeMaps[this._type];
      this._currentParams = {};
      this._triggered = {};

      Tone.PolySynth.call(this, undefined, ctr);
      var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps[this._type]);
      this._normalizedObjectSet(def, true);
      this._normalizedObjectSet(options, true);
    }

    Tone.extend(ToneInstrument, Tone.PolySynth);
    r._addGraphFunctions(ToneInstrument);
    r._addInstrumentFunctions(ToneInstrument);

    ToneInstrument.prototype.triggerAttack = function(id, pitch, delay, velocity) {
      // Don't play out-of-range notes
      if (pitch < 0 || pitch > 127) {
        return;
      }
      var tA = Tone.PolySynth.prototype.triggerAttack;

      var freq = Rhombus.Util.noteNum2Freq(pitch);
      this._triggered[id] = freq;

      velocity = (+velocity >= 0.0 && +velocity <= 1.0) ? +velocity : 0.5;

      if (delay > 0) {
        tA.call(this, freq, "+" + delay, velocity);
      } else {
        tA.call(this, freq, "+" + 0, velocity);
      }
    };

    ToneInstrument.prototype.triggerRelease = function(id, delay) {
      var tR = Tone.PolySynth.prototype.triggerRelease;
      var freq = this._triggered[id];
      if (delay > 0) {
        tR.call(this, freq, "+" + delay);
      } else {
        tR.call(this, freq);
      }
      delete this._triggered[id];
    };

    ToneInstrument.prototype.killAllNotes = function() {
      var freqs = [];
      for (var id in this._triggered) {
        freqs.push(this._triggered[id]);
      }
      Tone.PolySynth.prototype.triggerRelease.call(this, freqs);
      this._triggered = {};
    };

    ToneInstrument.prototype.toJSON = function() {
      var gc, gp;
      if (isDefined(this._graphChildren)) {
        gc = this._graphChildren;
      } else {
        gc = [];
      }

      if (isDefined(this._graphParents)) {
        gp = this._graphParents;
      } else {
        gp = [];
      }

      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams,
        "_graphChildren": gc,
        "_graphParents": gp
      };
      return jsonVersion;
    };

    var secondsDisplay = Rhombus._map.secondsDisplay;
    var dbDisplay = Rhombus._map.dbDisplay;
    var rawDisplay = Rhombus._map.rawDisplay;
    var hzDisplay = Rhombus._map.hzDisplay;

    var monoSynthMap = {
      "portamento" : [Rhombus._map.mapLinear(0, 10), secondsDisplay, 0],
      "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
      "oscillator" : {
        "type" : [Rhombus._map.mapDiscrete("square", "sawtooth", "triangle", "sine", "pulse", "pwm"), rawDisplay, 0.0],
      },
      "envelope" : Rhombus._map.envelopeMap,
      "filter" : Rhombus._map.filterMap,
      "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
      "detune" : [Rhombus._map.harmMapFn, rawDisplay, 0.5]
    };

    var unnormalizeMaps = {
      "mono" : monoSynthMap,

      "am" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), secondsDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        // TODO: verify this is good
        "harmonicity" : [Rhombus._map.harmMapFn, rawDisplay, 0.5],
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "fm" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), secondsDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        // TODO: verify this is good
        "harmonicity" : [Rhombus._map.harmMapFn, rawDisplay, 0.5],
        // TODO: verify this is good
        "modulationIndex" : [Rhombus._map.mapLinear(-5, 5), rawDisplay, 0.5],
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "noise" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), rawDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        "noise" : {
          "type" : [Rhombus._map.mapDiscrete("white", "pink", "brown"), rawDisplay, 0.0]
        },
        "envelope" : Rhombus._map.envelopeMap,
        "filter" : Rhombus._map.filterMap,
        "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
      },

      "duo" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), rawDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        "vibratoAmount" : [Rhombus._map.mapLinear(0, 20), rawDisplay, 0.025],
        "vibratoRate" : [Rhombus._map.freqMapFn, hzDisplay, 0.1],
        "vibratoDelay" : [Rhombus._map.timeMapFn, secondsDisplay, 0.1],
        "harmonicity" : [Rhombus._map.harmMapFn, rawDisplay, 0.5],
        "voice0" : monoSynthMap,
        "voice1" : monoSynthMap
      }
    };

    ToneInstrument.prototype._normalizedObjectSet = function(params, internal) {
      if (notObject(params)) {
        return;
      }

      if (!internal) {
        var rthis = this;
        var oldParams = this._currentParams;

        r.Undo._addUndoAction(function() {
          rthis._normalizedObjectSet(oldParams, true);
        });
      }
      this._trackParams(params);
      var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap);
      this.set(unnormalized);
    };

    r._ToneInstrument = ToneInstrument;
  };
})(this.Rhombus);
