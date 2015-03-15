//! rhombus.sampler.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._samplerSetup = function(r) {

    function SuperToneSampler() {
      Tone.Sampler.call(this, Array.prototype.slice.call(arguments));
    }
    Tone.extend(SuperToneSampler, Tone.Sampler);

    SuperToneSampler.prototype.triggerAttack = function(note, time, velocity, offset) {
      // Exactly as in Tone.Sampler, except add a parameter to let you control
      // sample offset.
      if (notDefined(offset)) {
        offset = 0;
      }

      time = this.toSeconds(time);
      this.player.setPlaybackRate(this._playbackRate, time);
      this.player.start(time, offset);
      this.envelope.triggerAttack(time, velocity);
      this.filterEnvelope.triggerAttack(time);
    };

    SuperToneSampler.prototype.set = function(params) {
      if (notDefined(params)) {
        return;
      }

      if (isDefined(params.volume)) {
        this.player.setVolume(params.volume);
      }
      if (isDefined(params.playbackRate)) {
        this._playbackRate = params.playbackRate;
      }

      Tone.Sampler.prototype.set.call(this, params);
    };

    function Sampler(options, id) {
      if (isNull(id) || notDefined(id)) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      Tone.Instrument.call(this);

      this._names = {};
      this.samples = {};
      this._triggered = {};
      this._currentParams = {};

      var sampleSet = "drums1";
      if (isDefined(options) && isDefined(options.sampleSet)) {
        sampleSet = options.sampleSet;
      }
      this._sampleSet = sampleSet;

      var thisSampler = this;

      var finish = function() {
        var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps["samp"]);
        thisSampler._normalizedObjectSet(def, true);
        if (isDefined(options) && isDefined(options.params)) {
          thisSampler._normalizedObjectSet(options.params, true);
        }
      };

      if (isDefined(r._sampleResolver)) {
        r._sampleResolver(sampleSet, function(bufferMap) {
          thisSampler.setBuffers(bufferMap);
          finish();
        });
      } else {
        finish();
      }
    }
    Tone.extend(Sampler, Tone.Instrument);
    r._addGraphFunctions(Sampler);

    Sampler.prototype.setBuffers = function(bufferMap) {
      if (notDefined(bufferMap)) {
        return;
      }

      this.killAllNotes();

      this._names = {};
      this.samples = {};
      this._triggered = {};

      var pitches = Object.keys(bufferMap);
      for (var i = 0; i < pitches.length; ++i) {
        var pitch = pitches[i];
        var sampler = new SuperToneSampler();
        var bufferAndName = bufferMap[pitch];
        sampler.player.setBuffer(bufferAndName[0]);
        sampler.connect(this.output);

        this.samples[pitch] = sampler;
        var sampleName = bufferAndName[1];
        if (notDefined(sampleName)) {
          this._names[pitch] = "" + i;
        } else {
          this._names[pitch] = sampleName;
        }
      }
    };

    Sampler.prototype.triggerAttack = function(id, pitch, delay, velocity) {
      if (Object.keys(this.samples).length === 0) {
        return;
      }

      if (pitch < 0 || pitch > 127) {
        return;
      }

      // TODO: remove this temporary kludge after the beta
      pitch = (pitch % 12) + 36;

      var sampler = this.samples[pitch];
      if (notDefined(sampler)) {
        return;
      }

      this._triggered[id] = pitch;

      velocity = (+velocity >= 0.0 && +velocity <= 1.0) ? +velocity : 0.5;

      // TODO: real keyzones, pitch control, etc.
      if (delay > 0) {
        sampler.triggerAttack(0, "+" + delay, velocity);
      } else {
        sampler.triggerAttack(0, "+0", velocity);
      }
    };

    Sampler.prototype.triggerRelease = function(id, delay) {
      delete this._triggered[id];
      return;
      // HACK: maybe leaking
      /*
      if (this.samples.length === 0) {
        return;
      }

      var idx = this._triggered[id];
      if (notDefined(idx)) {
        return;
      }

      if (delay > 0) {
        this.samples[idx].triggerRelease("+" + delay);
      } else {
        this.samples[idx].triggerRelease();
      }
      */
    };

    Sampler.prototype.killAllNotes = function() {
      var samplerKeys = Object.keys(this.samples);
      for (var idx in samplerKeys) {
        var sampler = this.samples[samplerKeys[idx]];
        sampler.triggerRelease();
      }
      this.triggered = {};
    };

    Sampler.prototype._trackParams = function(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    };

    Sampler.prototype.toJSON = function() {
      var params = { 
        "params": this._currentParams,
        "sampleSet": this._sampleSet
      };

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
        "_type": "samp",
        "_params": params,
        "_graphChildren": gc,
        "_graphParents": gp
      };
      return jsonVersion;
    };

    // The map is structured like this for the Rhombus._map.unnormalizedParams call.
    var unnormalizeMaps = {
      "samp" : {
        "volume" : [Rhombus._map.mapLog(-96.32, 0), Rhombus._map.dbDisplay, 0.1],
        "playbackRate" : [Rhombus._map.mapExp(0.1, 10), Rhombus._map.rawDisplay, 0.5],
        "player" : {
          "loop" : [Rhombus._map.mapDiscrete(false, true), Rhombus._map.rawDisplay, 0]
        },
        "envelope" : Rhombus._map.envelopeMap,
        "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
        "filter" : Rhombus._map.filterMap
      }
    };

    function unnormalizedParams(params) {
      return Rhombus._map.unnormalizedParams(params, "samp", unnormalizeMaps);
    }

    Sampler.prototype._normalizedObjectSet = function(params, internal) {
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

      var unnormalized = unnormalizedParams(params);
      var samplerKeys = Object.keys(this.samples);
      for (var idx in samplerKeys) {
        var sampler = this.samples[samplerKeys[idx]];
        sampler.set(unnormalized);
      }
    };

    Sampler.prototype.parameterCount = function() {
      return Rhombus._map.subtreeCount(unnormalizeMaps["samp"]);
    };

    Sampler.prototype.parameterName = function(paramIdx) {
      var name = Rhombus._map.getParameterName(unnormalizeMaps["samp"], paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    };

    // Parameter display stuff
    Sampler.prototype.parameterDisplayString = function(paramIdx) {
      return this.parameterDisplayStringByName(this.parameterName(paramIdx));
    };

    Sampler.prototype.parameterDisplayStringByName = function(paramName) {
      var pieces = paramName.split(":");

      var curValue = this._currentParams;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var setObj = Rhombus._map.generateSetObjectByName(unnormalizeMaps["samp"], paramName, curValue);
      var realObj = unnormalizedParams(setObj, this._type);

      curValue = realObj;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var displayValue = curValue;
      var disp = Rhombus._map.getDisplayFunctionByName(unnormalizeMaps["samp"], paramName);
      return disp(displayValue);
    };

    Sampler.prototype.normalizedGet = function(paramIdx) {
      return Rhombus._map.getParameterValue(this._currentParams, paramIdx);
    };

    Sampler.prototype.normalizedGetByName = function(paramName) {
      return Rhombus._map.getParameterValueByName(this._currentParams, paramName);
    };

    Sampler.prototype.normalizedSet = function(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(unnormalizeMaps["samp"], paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    };

    Sampler.prototype.normalizedSetByName = function(paramName, paramValue) {
      var setObj = Rhombus._map.generateSetObjectByName(unnormalizeMaps["samp"], paramName, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    };

    r._Sampler = Sampler;
  };
})(this.Rhombus);
