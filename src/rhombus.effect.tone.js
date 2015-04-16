//! rhombus.effect.tone.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {

  // http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
  function construct(ctr, args) {
    function F() {
      return ctr.apply(this, args);
    }
    F.prototype = ctr.prototype;
    return new F();
  }

  var rawDisplay = Rhombus._map.rawDisplay;
  var secondsDisplay = Rhombus._map.secondsDisplay;
  var dbDisplay = Rhombus._map.dbDisplay;

  Rhombus._wrappedEffectSetup = function(r) {

    function makeEffectMap(obj) {
      var newObj = {};
      for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          newObj[prop] = obj[prop];
        }
      }
      newObj["dry"] = [Rhombus._map.mapIdentity, rawDisplay, 0];
      newObj["wet"] = [Rhombus._map.mapIdentity, rawDisplay, 1];
      return newObj;
    }

    // Distortion
    function dist() {
      Tone.Distortion.apply(this, arguments);
    }
    Tone.extend(dist, Tone.Distortion);
    r._addEffectFunctions(dist);
    r._Distortion = dist;

    dist.prototype._unnormalizeMap = makeEffectMap({
      "distortion" : [Rhombus._map.mapIdentity, rawDisplay, 0.4],
      "oversample" : [Rhombus._map.mapDiscrete("none", "2x", "4x"), rawDisplay, 0.0]
    });

    dist.prototype.displayName = function() {
      return "Distortion";
    };

    // BitCrusher
    function bitcrusher() {
      Tone.Effect.apply(this, arguments);
    }
    Tone.extend(bitcrusher, Tone.Effect);
    r._addEffectFunctions(bitcrusher);
    r._BitCrusher = bitcrusher;

    bitcrusher.prototype.set = function(options) {
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

    var bitValues = [];
    (function() {
      for (var i = 1; i <= 16; i++) {
        bitValues.push(i);
      }
    })();
    bitcrusher.prototype._unnormalizeMap = makeEffectMap({
      "bits" : [Rhombus._map.mapDiscrete.apply(this, bitValues), rawDisplay, 0.49]
    });

    bitcrusher.prototype.displayName = function() {
      return "Bitcrusher";
    };

    // Filter
    function filter() {
      Tone.Effect.call(this);
      this._filter = construct(Tone.Filter, arguments);
      this.connectEffect(this._filter);
    }
    Tone.extend(filter, Tone.Effect);
    r._addEffectFunctions(filter);
    r._Filter = filter;

    filter.prototype.set = function() {
      Tone.Effect.prototype.set.apply(this, arguments);
      this._filter.set.apply(this._filter, arguments);
    };

    filter.prototype._unnormalizeMap = makeEffectMap(Rhombus._map.filterMap);

    filter.prototype.displayName = function() {
      return "Filter";
    };

    // EQ
    function eq() {
      Tone.Effect.call(this);
      this._eq = construct(Tone.EQ, arguments);
      this.connectEffect(this._eq);
    }
    Tone.extend(eq, Tone.Effect);
    r._addEffectFunctions(eq);
    r._EQ = eq;

    eq.prototype.set = function() {
      Tone.Effect.prototype.set.apply(this, arguments);
      this._eq.set.apply(this._eq, arguments);
    };

    var volumeMap = [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 1.0];
    eq.prototype._unnormalizeMap = makeEffectMap({
      "low" : volumeMap,
      "mid" : volumeMap,
      "high" : volumeMap,
      "lowFrequency" : [Rhombus._map.freqMapFn, Rhombus._map.hzDisplay, 0.2],
      "highFrequency": [Rhombus._map.freqMapFn, Rhombus._map.hzDisplay, 0.8]
    });

    eq.prototype.displayName = function() {
      return "EQ";
    };

    // Compressor
    function comp() {
      Tone.Effect.call(this);
      this._comp = construct(Tone.Compressor, arguments);
      this.connectEffect(this._comp);
    }
    Tone.extend(comp, Tone.Effect);
    r._addEffectFunctions(comp);
    r._Compressor = comp;

    comp.prototype.set = function() {
      Tone.Effect.prototype.set.apply(this, arguments);
      this._comp.set.apply(this._comp, arguments);
    };

    comp.prototype._unnormalizeMap = makeEffectMap({
      "attack" : [Rhombus._map.timeMapFn, secondsDisplay, 0.0],
      "release" : [Rhombus._map.timeMapFn, secondsDisplay, 0.0],
      "threshold" : [Rhombus._map.mapLog(-100, 0), dbDisplay, 0.3],
      "knee" : [Rhombus._map.mapLinear(0, 40), dbDisplay, 0.75],
      "ratio" : [Rhombus._map.mapLinear(1, 20), dbDisplay, 11.0/19.0]
    });

    comp.prototype.displayName = function() {
      return "Compressor";
    };

    // Gain
    function gain() {
      Tone.Effect.call(this);
      this.effectSend.connect(this.effectReturn);
    }
    Tone.extend(gain, Tone.Effect);
    r._addEffectFunctions(gain);
    r._Gainer = gain;

    gain.prototype.set = function(options) {
      Tone.Effect.prototype.set.apply(this, arguments);
      if (isDefined(options) && isDefined(options.gain)) {
        this.input.gain.value = options.gain;
      }
    };

    gain.prototype._unnormalizeMap = makeEffectMap({
      "gain" : [Rhombus._map.mapLinear(0, 3), rawDisplay, 1.0/3.0]
    });

    gain.prototype.displayName = function() {
      return "Gain";
    };

    // For feedback effects
    var feedbackMapSpec = [Rhombus._map.mapLinear(-1, 1), rawDisplay, 0.5];

    // Chorus
    function chorus() {
      Tone.Chorus.call(this);
    }
    Tone.extend(chorus, Tone.Chorus);
    r._addEffectFunctions(chorus);
    r._Chorus = chorus;

    chorus.prototype._unnormalizeMap = makeEffectMap({
      "rate" : [Rhombus._map.mapLinear(0, 20), Rhombus._map.hzDisplay, 2.0],
      "delayTime" : [Rhombus._map.timeMapFn, secondsDisplay, 0.1],
      "depth" : [Rhombus._map.mapLinear(0, 2), rawDisplay, 0.35],
      "type" : [Rhombus._map.mapDiscrete("sine", "square", "sawtooth", "triangle"), rawDisplay, 0.0],
      "feedback" : feedbackMapSpec
    });

    chorus.prototype.displayName = function() {
      return "Chorus";
    };

    // (Feedback) Delay
    function delay() {
      Tone.FeedbackDelay.call(this);
    }
    Tone.extend(delay, Tone.FeedbackDelay);
    r._addEffectFunctions(delay);
    r._Delay = delay;

    delay.prototype._unnormalizeMap = makeEffectMap({
      "delayTime" : [Rhombus._map.timeMapFn, secondsDisplay, 0.2],
      "feedback" : feedbackMapSpec
    });

    delay.prototype.displayName = function() {
      return "Delay";
    };

    // Reverb
    function reverb() {
      Tone.Freeverb.call(this);
    }
    Tone.extend(reverb, Tone.Freeverb);
    r._addEffectFunctions(reverb);
    r._Reverb = reverb;

    reverb.prototype._unnormalizeMap = makeEffectMap({
      "roomSize" : [Rhombus._map.mapLinear(0.001, 0.999), rawDisplay, 0.7],
      "dampening" : [Rhombus._map.mapLinear(0, 1), rawDisplay, 0.5]
    });

    reverb.prototype.displayName = function() {
      return "Reverb";
    };

  };
})(this.Rhombus);
