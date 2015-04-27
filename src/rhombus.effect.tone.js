//! rhombus.effect.tone.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

// http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
Rhombus._construct = function(ctr, args) {
  function F() {
    return ctr.apply(this, args);
  }
  F.prototype = ctr.prototype;
  return new F();
};

// Distortion
Rhombus._Distortion = function() {
  Tone.Distortion.apply(this, arguments);
};
Tone.extend(Rhombus._Distortion, Tone.Distortion);
Rhombus._addEffectFunctions(Rhombus._Distortion);

Rhombus._Distortion.prototype._unnormalizeMap = Rhombus._makeEffectMap({
  "distortion" : [Rhombus._map.mapLinear(0, 4), Rhombus._map.rawDisplay, 0.4],
  "oversample" : [Rhombus._map.mapDiscrete("none", "2x", "4x"), Rhombus._map.rawDisplay, 0.0]
});

Rhombus._Distortion.prototype.displayName = function() {
  return "Distortion";
};

// BitCrusher
Rhombus._BitCrusher = function() {
  Tone.Effect.apply(this, arguments);
};
Tone.extend(Rhombus._BitCrusher, Tone.Effect);

Rhombus._BitCrusher.prototype.set = function(options) {
  Tone.Effect.prototype.set.apply(this, arguments);

  if (isDefined(options) && isDefined(options.bits)) {
    if (isDefined(this._bitCrusher)) {
      this.effectSend.disconnect();
      this._bitCrusher.disconnect();
      this._bitCrusher = undefined;
    }
    this._bitCrusher = new Tone.BitCrusher({ bits: options.bits });
    this.connectEffect(this._bitCrusher);
  }
};
Rhombus._addEffectFunctions(Rhombus._BitCrusher);

Rhombus._BitCrusher.prototype._unnormalizeMap = (function() {
  var bitValues = [];
  (function() {
    for (var i = 1; i <= 16; i++) {
      bitValues.push(i);
    }
  })();

  return Rhombus._makeEffectMap({
  "bits" : [Rhombus._map.mapDiscrete.apply(this, bitValues), Rhombus._map.rawDisplay, 0.49]
  });

})();

Rhombus._BitCrusher.prototype.displayName = function() {
  return "Bitcrusher";
};

// Filter
Rhombus._Filter = function() {
  Tone.Effect.call(this);
  this._filter = Rhombus._construct(Tone.Filter, arguments);
  this.connectEffect(this._filter);
};
Tone.extend(Rhombus._Filter, Tone.Effect);

Rhombus._Filter.prototype.set = function() {
  Tone.Effect.prototype.set.apply(this, arguments);
  this._filter.set.apply(this._filter, arguments);
};
Rhombus._addEffectFunctions(Rhombus._Filter);

Rhombus._Filter.prototype._unnormalizeMap = Rhombus._makeEffectMap(Rhombus._map.filterMap);

Rhombus._Filter.prototype.displayName = function() {
  return "Filter";
};

Rhombus._Filter.prototype.setAutomationValueAtTime = function(value, time) {
  var toSet = this._unnormalizeMap["frequency"][0](value);
  this._filter.frequency.setValueAtTime(toSet, time);
};

// EQ
Rhombus._EQ = function() {
  Tone.Effect.call(this);
  this._eq = Rhombus._construct(Tone.EQ, arguments);
  this.connectEffect(this._eq);
};
Tone.extend(Rhombus._EQ, Tone.Effect);

Rhombus._EQ.prototype.set = function() {
  Tone.Effect.prototype.set.apply(this, arguments);
  this._eq.set.apply(this._eq, arguments);
};
Rhombus._addEffectFunctions(Rhombus._EQ);

Rhombus._EQ.prototype._unnormalizeMap = (function() {
  var volumeMap = [Rhombus._map.mapLog(-96.32, 0), Rhombus._map.dbDisplay, 1.0];
  return Rhombus._makeEffectMap({
    "low" : volumeMap,
    "mid" : volumeMap,
    "high" : volumeMap,
    "lowFrequency" : [Rhombus._map.freqMapFn, Rhombus._map.hzDisplay, 0.2],
    "highFrequency": [Rhombus._map.freqMapFn, Rhombus._map.hzDisplay, 0.8]
  });
})();

Rhombus._EQ.prototype.displayName = function() {
  return "EQ";
};

// Compressor
Rhombus._Compressor = function() {
  Tone.Effect.call(this);
  this._comp = Rhombus._construct(Tone.Compressor, arguments);
  this.connectEffect(this._comp);
};
Tone.extend(Rhombus._Compressor, Tone.Effect);

Rhombus._Compressor.prototype.set = function() {
  Tone.Effect.prototype.set.apply(this, arguments);
  this._comp.set.apply(this._comp, arguments);
};
Rhombus._addEffectFunctions(Rhombus._Compressor);

Rhombus._Compressor.prototype._unnormalizeMap = Rhombus._makeEffectMap({
  "attack" : [Rhombus._map.timeMapFn, Rhombus._map.secondsDisplay, 0.0],
  "release" : [Rhombus._map.timeMapFn, Rhombus._map.secondsDisplay, 0.0],
  "threshold" : [Rhombus._map.mapLog(-100, 0), Rhombus._map.dbDisplay, 0.3],
  "knee" : [Rhombus._map.mapLinear(0, 40), Rhombus._map.dbDisplay, 0.75],
  "ratio" : [Rhombus._map.mapLinear(1, 20), Rhombus._map.dbDisplay, 11.0/19.0]
});

Rhombus._Compressor.prototype.displayName = function() {
  return "Compressor";
};

// Gain
Rhombus._Gainer = function() {
  Tone.Effect.call(this);
  this.effectSend.connect(this.effectReturn);
};
Tone.extend(Rhombus._Gainer, Tone.Effect);
Rhombus._addEffectFunctions(Rhombus._Gainer);

Rhombus._Gainer.prototype._unnormalizeMap = Rhombus._makeEffectMap({});

Rhombus._Gainer.prototype.displayName = function() {
  return "Gain";
};

// For feedback effects
Rhombus._map.feedbackMapSpec = [Rhombus._map.mapLinear(-1, 1), Rhombus._map.rawDisplay, 0.5];

// Chorus
Rhombus._Chorus = function() {
  Tone.Chorus.call(this);
};
Tone.extend(Rhombus._Chorus, Tone.Chorus);
Rhombus._addEffectFunctions(Rhombus._Chorus);

Rhombus._Chorus.prototype._unnormalizeMap = Rhombus._makeEffectMap({
  "rate" : [Rhombus._map.mapLinear(0.1, 10), Rhombus._map.hzDisplay, 2.0],
  "delayTime" : [Rhombus._map.shortTimeMapFn, Rhombus._map.secondsDisplay, 0.25],
  "depth" : [Rhombus._map.mapLinear(0, 2), Rhombus._map.rawDisplay, 0.35],
  "type" : [Rhombus._map.mapDiscrete("sine", "square", "sawtooth", "triangle"), Rhombus._map.rawDisplay, 0.0],
  "feedback" : [Rhombus._map.mapLinear(-0.25, 0.25), Rhombus._map.rawDisplay, 0.5]
});

Rhombus._Chorus.prototype.displayName = function() {
  return "Chorus";
};

// (Feedback) Delay
Rhombus._Delay = function() {
  Tone.FeedbackDelay.call(this);
}
Tone.extend(Rhombus._Delay, Tone.FeedbackDelay);
Rhombus._addEffectFunctions(Rhombus._Delay);

Rhombus._Delay.prototype._unnormalizeMap = Rhombus._makeEffectMap({
  "delayTime" : [Rhombus._map.timeMapFn, Rhombus._map.secondsDisplay, 0.2],
  "feedback" : Rhombus._map.feedbackMapSpec
});

Rhombus._Delay.prototype.displayName = function() {
  return "Delay";
};

// Reverb
Rhombus._Reverb = function() {
  Tone.Freeverb.call(this);
}
Tone.extend(Rhombus._Reverb, Tone.Freeverb);
Rhombus._addEffectFunctions(Rhombus._Reverb);

Rhombus._Reverb.prototype._unnormalizeMap = Rhombus._makeEffectMap({
  "roomSize" : [Rhombus._map.mapLinear(0.001, 0.999), Rhombus._map.rawDisplay, 0.7],
  "dampening" : [Rhombus._map.mapLinear(0, 1), Rhombus._map.rawDisplay, 0.5]
});

Rhombus._Reverb.prototype.displayName = function() {
  return "Reverb";
};
