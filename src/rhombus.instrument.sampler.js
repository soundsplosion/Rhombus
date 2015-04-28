//! rhombus.instrument.sampler.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus._SuperToneSampler = function() {
  Tone.Sampler.apply(this, Array.prototype.slice.call(arguments));
}
Tone.extend(Rhombus._SuperToneSampler, Tone.Sampler);

Rhombus._SuperToneSampler.prototype.triggerAttack = function(note, time, velocity, offset) {
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

Rhombus._SuperToneSampler.prototype.set = function(params) {
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

Rhombus._Sampler = function(options, r, sampleCallback, id) {
  var samplerUnnormalizeMap = {
    "volume" : [Rhombus._map.mapLog(-96.32, 0), Rhombus._map.dbDisplay, 0.56],
    "playbackRate" : [Rhombus._map.mapExp(0.25, 4), Rhombus._map.rawDisplay, 0.5],
    "envelope" : Rhombus._map.envelopeMap,
    "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
    "filter" : Rhombus._map.filterMap
  };

  this._r = r;
  if (isNull(id) || notDefined(id)) {
    r._newId(this);
  } else {
    r._setId(this, id);
  }

  Tone.Instrument.call(this);
  
  this._unnormalizeMap = samplerUnnormalizeMap;
  this._names = {};
  this.samples = {};
  this._triggered = {};
  this._currentParams = {};
  this._sampleSet = undefined;

  this._sampleSet = "drums1";
  if (isDefined(options) && isDefined(options.sampleSet)) {
    sampleSet = options.sampleSet;
  }
  this._sampleSet = sampleSet;

  var thisSampler = this;

  // We apply the params before so that this._currentParams is something reasonable.
  var def = Rhombus._map.generateDefaultSetObj(samplerUnnormalizeMap);
  thisSampler._normalizedObjectSet(def, true);
  if (isDefined(options) && isDefined(options.params)) {
    thisSampler._normalizedObjectSet(options.params, true);
  }

  function finish() {
    // Apply parameters to the actual loaded samplers now.
    thisSampler._normalizedObjectSet(thisSampler._currentParams, true);
    if (isDefined(sampleCallback)) {
      sampleCallback();
    }
  };

  if (isDefined(this._r._sampleResolver)) {
    this._r._sampleResolver(sampleSet, function(bufferMap) {
      thisSampler.setBuffers(bufferMap);
      finish();
    });
  } else {
    finish();
  }
};
Tone.extend(Rhombus._Sampler, Tone.Instrument);
Rhombus._addParamFunctions(Rhombus._Sampler);
Rhombus._addGraphFunctions(Rhombus._Sampler);
Rhombus._addAudioNodeFunctions(Rhombus._Sampler);

Rhombus._Sampler.prototype.setBuffers = function(bufferMap) {
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
    var sampler = new Rhombus._SuperToneSampler();
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

Rhombus._Sampler.prototype.triggerAttack = function(id, pitch, delay, velocity) {
  if (Object.keys(this.samples).length === 0) {
    return;
  }

  if (pitch < 0 || pitch > 127) {
    return;
  }

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

Rhombus._Sampler.prototype.triggerRelease = function(id, delay) {
  if (this._sampleSet.indexOf("drum") === -1) {
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
  }
  delete this._triggered[id];
};

Rhombus._Sampler.prototype.killAllNotes = function() {
  var samplerKeys = Object.keys(this.samples);
  for (var idx in samplerKeys) {
    var sampler = this.samples[samplerKeys[idx]];
    sampler.triggerRelease();
  }
  this.triggered = {};
};

Rhombus._Sampler.prototype.toJSON = function() {
  var params = {
    "params": this._currentParams,
    "sampleSet": this._sampleSet
  };

  var go = this._graphOutputs;
  var gi = this._graphInputs;

  var jsonVersion = {
    "_id": this._id,
    "_type": "samp",
    "_sampleSet" : this._sampleSet,
    "_params": params,
    "_graphOutputs": go,
    "_graphInputs": gi,
    "_graphX": this._graphX,
    "_graphY": this._graphY
  };
  return jsonVersion;
};

Rhombus._Sampler.prototype._normalizedObjectSet = function(params, internal) {
  if (notObject(params)) {
    return;
  }

  if (!internal) {
    var that = this;
    var oldParams = this._currentParams;
    this._r.Undo._addUndoAction(function() {
      that._normalizedObjectSet(oldParams, true);
    });
  }
  this._trackParams(params);

  var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap);
  var samplerKeys = Object.keys(this.samples);
  for (var idx in samplerKeys) {
    var sampler = this.samples[samplerKeys[idx]];
    sampler.set(unnormalized);
  }
};

Rhombus._Sampler.prototype.displayName = function() {
  return Rhombus._sampleNameMap[this._sampleSet];
};
