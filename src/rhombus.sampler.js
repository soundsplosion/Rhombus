//! rhombus.sampler.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._samplerSetup = function(r) {

    function SuperToneSampler() {
      Tone.Sampler.call(this, Array.prototype.slice.call(arguments));
    }

    SuperToneSampler.prototype.triggerAttack = function(note, time, velocity, offset) {
      // Exactly as in Tone.Sampler, except add a parameter to let you control
      // sample offset.
      if (offset === undefined) {
        offset = 0;
      }

      time = this.toSeconds(time);
      note = this.defaultArg(note, 0);
      this.player.setPlaybackRate(this.intervalToFrequencyRatio(note), time);
      this.player.start(time, offset);
      this.envelope.triggerAttack(time, velocity);
      this.filterEnvelope.triggerAttack(time);
    };

    Tone.extend(SuperToneSampler, Tone.Sampler);

    function Sampler(buffers, names, id) {
      if (id === undefined || id === null) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      Tone.Instrument.call(this);

      this.names = [];
      this.samples = [];
      this._triggered = {};

      this.setBuffers(buffers, names);
    }

    Tone.extend(Sampler, Tone.Instrument);

    Sampler.prototype.setBuffers = function(buffers, names) {
      if (buffers === undefined) {
        return;
      }

      var useDefaultNames = false;
      if (names === undefined) {
        useDefaultNames = true;
      }

      this.killAllNotes();
      this._names = [];
      this.samples = [];
      this._triggered = {};
      for (var i = 0; i < buffers.length; ++i) {
        var sampler = new SuperToneSampler();
        sampler.player.setBuffer(buffers[i]);

        // TODO: proper routing
        sampler.toMaster();

        this.samples.push(sampler);
        if (useDefaultNames) {
          this._names.push("" + i);
        } else {
          this._names.push(names[i]);
        }
      }
    };

    Sampler.prototype.triggerAttack = function(id, pitch, delay) {
      if (pitch < 0 || pitch > 127) {
        return;
      }

      var idx = Math.floor((pitch / 128) * this.samples.length);
      this._triggered[id] = idx;

      // TODO: real keyzones, pitch control, etc.
      if (delay > 0) {
        this.samples[idx].triggerAttack(0, "+" + delay);
      } else {
        this.samples[idx].triggerAttack(0);
      }
    };

    Sampler.prototype.triggerRelease = function(id, delay) {
      var idx = this._triggered[id];
      if (idx === undefined) {
        return;
      }

      if (delay > 0) {
        this.samples[idx].triggerRelease("+" + delay);
      } else {
        this.samples[idx].triggerRelease();
      }
    };

    Sampler.prototype.killAllNotes = function() {
      this.samples.forEach(function(sampler) {
        sampler.triggerRelease();
      });
      this.triggered = {};
    };

    Sampler.prototype._trackParams = function(params) {
      // TODO: this is an important part of serialization
      // need to clear this data when buffers are reset
    };

    Sampler.prototype.toJSON = function() {
      // TODO: we need a way to not save the actual audio data inside
      // the JSON data
      return undefined;
    };

    // The map is structured like this for the Rhombus._map.unnormalizedParams call.
    var unnormalizeMaps = {
      "samp" : {
        "player" : {
          "loop" : Rhombus._map.mapDiscrete(false, true)
        },
        "envelope" : Rhombus._map.envelopeMap,
        "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
        "filter" : Rhombus._map.filterMap
      }
    };

    function unnormalizedParams(params) {
      return Rhombus._map.unnormalizedParams(params, "samp", unnormalizeMaps);
    }

    Sampler.prototype.normalizedObjectSet = function(params) {
      this._trackParams(params);

      var samplers = Object.keys(params);
      for (var idx in samplers) {
        var samplerIdx = samplers[idx];
        var unnormalized = unnormalizedParams(params[samplerIdx]);
        this.samples[samplerIdx].set(unnormalized);
      }
    };

    Sampler.prototype.parameterCount = function() {
      return this.samples.length * Rhombus._map.subtreeCount(unnormalizeMaps["samp"]);
    };

    Sampler.prototype.parameterName = function(paramIdx) {
      var perSampler = Rhombus._map.subtreeCount(unnormalizeMaps["samp"]);
      var realParamIdx = paramIdx % perSampler;
      var sampleIdx = Math.floor(paramIdx / perSampler);

      var name = Rhombus._map.getParameterName(unnormalizedMaps["samp"], realParamIdx);
      if (typeof name !== "string") {
        return;
      }
      return this._names[sampleIdx] + ":" + name;
    };

    Sampler.prototype.normalizedSet = function(paramsIdx, paramValue) {
      var perSampler = Rhombus._map.subtreeCount(unnormalizeMaps["samp"]);
      var realParamIdx = paramIdx % perSampler;
      var sampleIdx = Math.floor(paramIdx / perSampler);

      var setObj = Rhombus._map.generateSetObject(unnormalizeMaps["samp"], realParamIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this.normalizedSetObj({ sampleIdx : setObj });
    };

    r._Sampler = Sampler;
  };
})(this.Rhombus);
