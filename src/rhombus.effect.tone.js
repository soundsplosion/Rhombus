//! rhombus.effect.tone.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {
  Rhombus._wrappedEffectSetup = function(r) {

    var rawDisplay = Rhombus._map.rawDisplay;

    function dist() {
      Tone.Distortion.apply(this, arguments);
    }
    Tone.extend(dist, Tone.Distortion);
    r._addEffectFunctions(dist);
    r._Distortion = dist;

    dist.prototype._unnormalizeMap = {
      "dry" : [Rhombus._map.mapIdentity, rawDisplay, 0],
      "wet" : [Rhombus._map.mapIdentity, rawDisplay, 1]
    };

  };
})(this.Rhombus);
