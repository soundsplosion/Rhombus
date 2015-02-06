//! rhombus.effect.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {
  Rhombus._effectSetup = function(r) {

    var dist = Tone.Distortion;
    var typeMap = {
      // TODO: more effect types
      "dist": dist
    };

    function makeEffect(type, options, id) {
      var ctr = typeMap[type];
      if (ctr === null || ctr === undefined) {
        type = "dist";
        ctr = dist;
      }

      var unnormalized = unnormalizedParams(options, type);
      var eff = new ctr(unnormalized);
      if (id === undefined || id === null) {
        r._newId(eff);
      } else {
        r._setId(eff, id);
      }

      installFunctions(eff);
      eff._type = type;
      eff._currentParams = {};
      eff._trackParams(options);

      return eff;
    }

    function installFunctions(eff) {
      eff.normalizedSet = normalizedSet;
      eff.toJSON = toJSON;
      eff._trackParams = trackParams;
    }

    r.addEffect = function(type, options, id) {
      var effect = makeEffect(type, options, id);

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

    var unnormalizeMaps = {
      "dist" : {
        "dry" : Rhombus._map.mapIdentity,
        "wet" : Rhombus._map.mapIdentity
      },
      // TODO: more stuff here
    };

    function unnormalizedParams(params, type) {
      return Rhombus._map.unnormalizedParams(params, type, unnormalizeMaps);
    }

    function normalizedSet(params) {
      this._trackParams(params);
      var unnormalized = unnormalizedParams(params, this._type);
      this.set(unnormalized);
    }

    function toJSON(params) {
      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams
      };
      return jsonVersion;
    }

    function trackParams(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    }

  };
})(this.Rhombus);
