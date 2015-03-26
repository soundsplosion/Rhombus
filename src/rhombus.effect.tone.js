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

    var distParams = {
      // TODO: more here
    };
    dist.prototype._unnormalizeMap = makeEffectMap(distParams);

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

    // Delay
    function delay() {
      Tone.Effect.call(this);
      this._delay = r._ctx.createDelay(10.5);
      this.connectEffect(this._delay);
    }
    Tone.extend(delay, Tone.Effect);
    r._addEffectFunctions(delay);
    r._Delay = delay;

    delay.prototype.set = function(options) {
      Tone.Effect.prototype.set.apply(this, arguments);
      if (isDefined(options) && isDefined(options.delay)) {
        this._delay.delayTime.value = options.delay;
      }
    };

    delay.prototype._unnormalizeMap = makeEffectMap({
      "delay" : [Rhombus._map.timeMapFn, secondsDisplay, 0.2]
    });

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
  };
})(this.Rhombus);
