//! rhombus.effect.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {
  Rhombus._effectSetup = function(r) {

    var dist = Tone.Distortion;
    var typeMap = {
      "dist": dist
    };

    // TODO: how to structure this? (prototypes, etc.)
    /*
    function Effect(type, options, id) {
      var ctr = typeMap[type];
      if (ctr === null || ctr === undefined) {
        ctr = dist;
      }

      if (id === undefined || id === null) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      this._type = type;
      this._currentParams = {};
      this._trackParams(options);

      var unnormalized = unnormalizedParams(options, this._type);
      Tone.Effect.
    }
    */

    r.addEffect(type, options, id) {
      var effect = /*new Effect(type, options, id);*/ undefined;

      if (effect === null || effect === undefined) {
        return;
      }

      r._song._effects[effect._id] = effect;
      return effect._id;
    }

    function inToId(effectOrId) {
      var id;
      if (typeof effectOrId === "object") {
        id = effectOrId._id;
      } else {
        id = +id;
      }
      return id;
    }

    r.removeEffect = function(effectOrId) {
      var id = inToId(effectOrId);
      if (id < 0) {
        return;
      }

      delete r._song._effects[id];
    }

    // TODO: add normalized parameter stuff
  };
})(this.Rhombus);
