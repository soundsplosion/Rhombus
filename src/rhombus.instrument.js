//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

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
      this._triggered = {};

      Tone.PolySynth.call(this, undefined, ctr);
      var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps[this._type]);
      this.normalizedObjectSet(def);
      this.normalizedObjectSet(options);

      // TODO: don't route everything to master
      this.toMaster();
    }
    Tone.extend(Instrument, Tone.PolySynth);

    r.addInstrument = function(type, options, id) {
      var instr;
      if (type === "samp") {
        instr = new r._Sampler(options, id);
      } else {
        instr = new Instrument(type, options, id);
      }

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

    var secondsDisplay = Rhombus._map.secondsDisplay;
    var dbDisplay = Rhombus._map.dbDisplay;
    var rawDisplay = Rhombus._map.rawDisplay;
    var hzDisplay = Rhombus._map.hzDisplay;
    
    var monoSynthMap = {
      "portamento" : [Rhombus._map.mapLinear(0, 10), secondsDisplay, 0],
      // TODO: verify this is good
      "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
      "oscillator" : {
        "type" : [Rhombus._map.mapDiscrete("sine", "square", "triangle", "sawtooth", "pulse", "pwm"), rawDisplay, 0],
      },
      "envelope" : Rhombus._map.envelopeMap,
      "filter" : Rhombus._map.filterMap,
      "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
      "detune" : [Rhombus._map.harmMapFn, rawDisplay, 0]
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

    function unnormalizedParams(params, type) {
      return Rhombus._map.unnormalizedParams(params, type, unnormalizeMaps);
    }

    Instrument.prototype.normalizedObjectSet = function(params) {
      if (typeof params !== "object") {
        return;
      }

      this._trackParams(params);
      var unnormalized = unnormalizedParams(params, this._type);
      this.set(unnormalized);
    };

    // Parameter list interface
    Instrument.prototype.parameterCount = function() {
      return Rhombus._map.subtreeCount(unnormalizeMaps[this._type]);
    };

    Instrument.prototype.parameterName = function(paramIdx) {
      var name = Rhombus._map.getParameterName(unnormalizeMaps[this._type], paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    };

    // Parameter display string stuff
    Instrument.prototype.parameterDisplayString = function(paramIdx) {
      return this.parameterDisplayStringByName(this.parameterName(paramIdx));
    };

    Instrument.prototype.parameterDisplayStringByName = function(paramName) {
      var pieces = paramName.split(":");

      var curValue = this._currentParams;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (curValue === undefined) {
        return;
      }

      var setObj = Rhombus._map.generateSetObjectByName(unnormalizeMaps[this._type], paramName, curValue);
      var realObj = unnormalizedParams(setObj, this._type);

      curValue = realObj;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (curValue === undefined) {
        return;
      }

      var displayValue = curValue;
      var disp = Rhombus._map.getDisplayFunctionByName(unnormalizeMaps[this._type], paramName);
      return disp(displayValue);
    };

    // Parameter setting stuff
    Instrument.prototype.normalizedSet = function(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(unnormalizeMaps[this._type], paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this.normalizedObjectSet(setObj);
    };

    Instrument.prototype.normalizedSetByName = function(paramName, paramValue) {
      var setObj = Rhombus._map.generateSetObjectByName(unnormalizeMaps[this._type], paramName, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this.normalizedObjectSet(setObj);
    };

    // HACK: these are here until proper note routing is implemented
    var samplesPerCycle = Math.floor(Tone.context.sampleRate / 440);
    var sampleCount = Tone.context.sampleRate * 2.0;
    var buffer = Tone.context.createBuffer(2, sampleCount, Tone.context.sampleRate);
    for (var i = 0; i < 2; i++) {
      var buffering = buffer.getChannelData(i);
      for (var v = 0; v < sampleCount; v++) {
        buffering[v] = (v % samplesPerCycle) / samplesPerCycle;
      }
    }
    r.buf = buffer;

    var instrId = r.addInstrument("mono");
    r._song._instruments[instrId].normalizedObjectSet({ volume: 0.1 });
    // HACK: end

    // only one preview note is allowed at a time
    var previewNote = undefined;

    r.setParameter = function(paramIdx, value) {
      for (var instId in r._song._instruments) {
        r._song._instruments[instId].normalizedSet(paramIdx, value);
      }
    };

    r.setParameterByName = function(paramName, value) {
      for (var instId in r._song._instruments) {
        r._song._instruments[instId].normalizedSetByName(paramName, value);
      }
    }

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
