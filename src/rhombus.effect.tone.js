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

  Rhombus._wrappedEffectSetup = function(r) {

    var rawDisplay = Rhombus._map.rawDisplay;
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

  };
})(this.Rhombus);
