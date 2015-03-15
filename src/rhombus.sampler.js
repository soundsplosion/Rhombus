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
      note = this.defaultArg(note, 0);
      this.player.setPlaybackRate(this.intervalToFrequencyRatio(note), time);
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

      Tone.Sampler.prototype.set.call(this, params);
    };

    function Sampler(options, id) {
      if (isNull(id) || notDefined(id)) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      Tone.Instrument.call(this);

      this._names = [];
      this.samples = [];
      this._triggered = {};
      this._currentParams = {};

        /*
      if (isDefined(options)) {
        var params = options.params;
        var names = options.names;
        var buffs = options.buffs;

        var setNames = names;
        var setBufs = [];
        for (var i = 0; i < buffs.length; i++) {
          var channels = buffs[i];
          var setBuf = Tone.context.createBuffer(channels.length, channels[0].length, Tone.context.sampleRate);

          for (var chI = 0; chI < channels.length; chI++) {
            var getChanData = channels[chI];
            var setChanData = setBuf.getChannelData(chI);
            for (var sI = 0; sI < getChanData.length; sI++) {
              var dat = getChanData[sI];
              if (notDefined(dat)) {
                dat = 0;
              }
              setChanData[sI] = dat;
            }
          }
          setBufs.push(setBuf);
        }

        this.setBuffers(setBufs, setNames);

        this._normalizedObjectSet(params, true);
      }
        */

      var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps["samp"]);
      this._normalizedObjectSet(def, true);
      this._normalizedObjectSet(options, true);
    }
    Tone.extend(Sampler, Tone.Instrument);
    r._addGraphFunctions(Sampler);

    Sampler.prototype.setBuffers = function(buffers, names) {
      if (notDefined(buffers)) {
        return;
      }

      var useDefaultNames = false;
      if (notDefined(names)) {
        useDefaultNames = true;
      }

      this.killAllNotes();

      this._names = [];
      this.samples = [];
      this._triggered = {};

      for (var i = 0; i < buffers.length; ++i) {
        var sampler = new SuperToneSampler();
        sampler.player.setBuffer(buffers[i]);
        sampler.connect(this.output);

        this.samples.push(sampler);
        if (useDefaultNames || notDefined(names[i])) {
          this._names.push("" + i);
        } else {
          this._names.push(names[i]);
        }
      }
      this._normalizedObjectSet(this._currentParams, true);
    };

    Sampler.prototype.triggerAttack = function(id, pitch, delay, velocity) {
      if (this.samples.length === 0) {
        return;
      }

      if (pitch < 0 || pitch > 127) {
        return;
      }

      var idx = pitch % this.samples.length;
      this._triggered[id] = idx;

      velocity = (+velocity >= 0.0 && +velocity <= 1.0) ? +velocity : 0.5;

      // TODO: real keyzones, pitch control, etc.
      if (delay > 0) {
        this.samples[idx].triggerAttack(0, "+" + delay, velocity);
      } else {
        this.samples[idx].triggerAttack(0, "+" + 0, velocity);
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
      this.samples.forEach(function(sampler) {
        sampler.triggerRelease();
      });
      this.triggered = {};
    };

    Sampler.prototype._trackParams = function(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    };

    Sampler.prototype.toJSON = function() {
      /*
      var buffs = [];
      for (var sampIdx = 0; sampIdx < this.samples.length; sampIdx++) {
        var channels = [];
        var audioBuf = this.samples[sampIdx].player._buffer;
        for (var chanIdx = 0; chanIdx < audioBuf.numberOfChannels; chanIdx++) {
          var chan = [];
          var audioData = audioBuf.getChannelData(chanIdx);
          for (var sIdx = 0; sIdx < audioData.length; sIdx++) {
            chan[sIdx] = audioData[sIdx];
          }
          channels.push(chan);
        }
        buffs.push(channels);
      }
      */


      /*var params = {
        "params": this._currentParams
        "names": this._names,
        "buffs": buffs
      };
      */
      var params = this._currentParams;

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
      this.samples.forEach(function(sampler) {
        sampler.set(unnormalized);
      });
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
      // TODO: fix probable bugs here
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
