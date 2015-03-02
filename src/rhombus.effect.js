//! rhombus.effect.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {
  Rhombus._effectSetup = function(r) {

    var dist = Tone.Distortion;
    var mast = Rhombus.Master;

    r._addGraphFunctions(dist);
    r._addGraphFunctions(mast);
    installFunctions(dist);
    installFunctions(mast);

    var typeMap = {
      // TODO: more effect types
      "dist": dist,
      "mast": mast
    };

    function makeEffect(type, options, gc, gp, id) {
      var ctr = typeMap[type];
      if (isNull(ctr) || notDefined(ctr)) {
        type = "dist";
        ctr = dist;
      }

      var unnormalized = unnormalizedParams(options, type);
      var eff = new ctr(unnormalized);
      if (isNull(id) || notDefined(id)) {
        r._newId(eff);
      } else {
        r._setId(eff, id);
      }

      if (isDefined(gc)) {
        for (var i = 0; i < gc.length; i++) {
          gc[i] = +(gc[i]);
        }
        eff._graphChildren = gc;
      }
      if (isDefined(gp)) {
        for (var i = 0; i < gp.length; i++) {
          gp[i] = +(gp[i]);
        }
        eff._graphParents = gp;
      }

      eff._type = type;
      eff._currentParams = {};
      eff._trackParams(options);

      return eff;
    }

    function isMaster() { return false; }
    function installFunctions(ctr) {
      ctr.prototype.normalizedObjectSet = normalizedObjectSet;
      ctr.prototype.parameterCount = parameterCount;
      ctr.prototype.parameterName = parameterName;
      ctr.prototype.normalizedSet = normalizedSet;
      ctr.prototype.toJSON = toJSON;
      ctr.prototype._trackParams = trackParams;
      ctr.prototype.isMaster = isMaster;
    }

    var masterAdded = false;
    r.addEffect = function(type, options, gc, gp, id) {
      if (masterAdded && type === "mast") {
        return;
      }

      var effect = makeEffect(type, options, gc, gp, id);

      if (isNull(effect) || notDefined(effect)) {
        return;
      }

      this._song._effects[effect._id] = effect;
      return effect._id;
    }

    // Add the master effect
    r.addEffect("mast");

    function inToId(effectOrId) {
      var id;
      if (typeof effectOrId === "object") {
        id = effectOrId._id;
      } else {
        id = +effectOrId;
      }
      return id;
    }

    r.removeEffect = function(effectOrId) {
      var id = inToId(effectOrId);
      if (id < 0) {
        return;
      }

      delete this._song._effects[id];
    }

    function toJSON(params) {
      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams,
        "_graphChildren": this._graphChildren,
        "_graphParents": this._graphParents
      };
      return jsonVersion;
    }

    // Parameter stuff
    var unnormalizeMaps = {
      "dist" : {
        "dry" : Rhombus._map.mapIdentity,
        "wet" : Rhombus._map.mapIdentity
      },
      "mast" : {}
      // TODO: more stuff here
    };

    function unnormalizedParams(params, type) {
      return Rhombus._map.unnormalizedParams(params, type, unnormalizeMaps);
    }

    function normalizedObjectSet(params) {
      this._trackParams(params);
      var unnormalized = unnormalizedParams(params, this._type);
      this.set(unnormalized);
    }

    // Parameter list interface
    function parameterCount() {
      return Rhombus._map.subtreeCount(unnormalizeMaps[this._type]);
    }

    function parameterName(paramIdx) {
      var name = Rhombus._map.getParameterName(unnormalizeMaps[this._type], paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    }

    function normalizedSet(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(unnormalizeMaps[this._type], paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this.normalizedObjectSet(setObj);
    }

    function trackParams(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    }

  };
})(this.Rhombus);
