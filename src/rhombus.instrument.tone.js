//! rhombus.instrument.tone.js
//! authors: Spencer Phippen, Tim Grant
//!
//! Contains instrument definitions for instruments wrapped from Tone.
//!
//! license: MIT
Rhombus._ToneInstrument = function(type, options, r, id) {
  var mono = Tone.MonoSynth;
  var typeMap = {
    "mono" : mono,
  };

  var secondsDisplay = Rhombus._map.secondsDisplay;
  var dbDisplay = Rhombus._map.dbDisplay;
  var rawDisplay = Rhombus._map.rawDisplay;
  var hzDisplay = Rhombus._map.hzDisplay;

  var monoSynthMap = {
    "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
    "oscillator" : {
      "type" : [Rhombus._map.mapDiscrete("square", "sawtooth", "triangle", "sine", "pulse", "pwm"), rawDisplay, 0.0],
    },
    "envelope" : Rhombus._map.envelopeMap,
    "filter" : Rhombus._map.synthFilterMap,
    "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
    "detune" : [Rhombus._map.harmMapFn, rawDisplay, 0.5]
  };

  var unnormalizeMaps = {
    "mono" : monoSynthMap
  };

  for (var key in unnormalizeMaps) {
    unnormalizeMaps[key] = Rhombus._makeAudioNodeMap(unnormalizeMaps[key]);
  }

  this._r = r;
  var ctr = typeMap[type];
  if (isNull(ctr) || notDefined(ctr)) {
    type = "mono";
    ctr = mono;
  }

  if (notDefined(id)) {
    this._r._newId(this);
  } else {
    this._r._setId(this, id);
  }

  // just a hack to stop this control from showing up
  if (isDefined(options)) {
    options["dry/wet"] = undefined;
  }

  this._type = type;
  this._unnormalizeMap = unnormalizeMaps[this._type];
  this._currentParams = {};
  this._triggered = {};

  Tone.PolySynth.call(this, undefined, ctr);
  var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps[this._type]);
  this._normalizedObjectSet(def, true);
  this._normalizedObjectSet(options, true);
};
Tone.extend(Rhombus._ToneInstrument, Tone.PolySynth);
Rhombus._addInstrumentFunctions(Rhombus._ToneInstrument);

Rhombus._ToneInstrument.prototype.triggerAttack = function(id, pitch, delay, velocity) {
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

Rhombus._ToneInstrument.prototype.triggerRelease = function(id, delay) {
  var tR = Tone.PolySynth.prototype.triggerRelease;
  var freq = this._triggered[id];
  if (delay > 0) {
    tR.call(this, freq, "+" + delay);
  } else {
    tR.call(this, freq);
  }
  delete this._triggered[id];
};

Rhombus._ToneInstrument.prototype.killAllNotes = function() {
  var freqs = [];
  for (var id in this._triggered) {
    freqs.push(this._triggered[id]);
  }
  Tone.PolySynth.prototype.triggerRelease.call(this, freqs);
  this._triggered = {};
};

Rhombus._ToneInstrument.prototype.toJSON = function() {
  var go = this._graphOutputs;
  var gi = this._graphInputs;

  var jsonVersion = {
    "_id": this._id,
    "_type": this._type,
    "_params": this._currentParams,
    "_graphOutputs": go,
    "_graphInputs": gi,
    "_graphX": this._graphX,
    "_graphY": this._graphY
  };
  return jsonVersion;
};

Rhombus._ToneInstrument.prototype._normalizedObjectSet = function(params, internal) {
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
  var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap, true);
  this.set(unnormalized);
};

Rhombus._ToneInstrument.prototype._applyInstrumentFilterValueAtTime = function(freq, time) {
  for (var vIdx = 0; vIdx < this._voices.length; vIdx++) {
    var voice = this._voices[vIdx];
    voice.filter.frequency.setValueAtTime(freq, time);
  }
};


Rhombus._ToneInstrument.prototype.displayName = function() {
  return Rhombus._synthNameMap[this._type];
};
