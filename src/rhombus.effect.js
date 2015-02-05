//! rhombus.effect.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {
  Rhombus._effectSetup = function(r) {

    var dist = Tone.Distortion;
    var typeMap = {
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
    }

    function installFunctions(eff) {
      eff.set
    }

    r.addEffect(type, options, id) {
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
      "dry" : mapIdentity,
    };

    function unnormalizedParams(params, type) {
      if (params === undefined || params === null ||
          typeof params !== "object") {
        return params;
      }

      function unnormalized(obj, thisLevelMap) {
        var returnObj = {};
        var keys = Object.keys(obj);
        for (var idx in keys) {
          var key = keys[idx];
          var value = obj[key];
          if (typeof value === "object") {
            var nextLevelMap = thisLevelMap[key];
            returnObj[key] = unnormalized(value, nextLevelMap);
          } else {
            var ctrXformer = thisLevelMap != undefined ? thisLevelMap[key] : undefined;
            if (ctrXformer !== undefined) {
              returnObj[key] = ctrXformer(value);
            } else {
              returnObj[key] = value;
            }
          }
        }
        return returnObj;
      }

      return unnormalized(params, unnormalizeMaps[type]);
    }

    function normalizedSet(params) {
      this._trackParams(params);
      var unnormalized = unnormalizedParams(params, this._type);
      this.set(unnormalized);
    }

  };
})(this.Rhombus);
