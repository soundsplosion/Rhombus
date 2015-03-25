//! rhombus.effect.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {
  Rhombus._effectSetup = function(r) {

    function masterAdded(song) {
      var effs = song.getEffects();
      var effIds = Object.keys(song.getEffects());
      for (var i = 0; i < effIds.length; i++) {
        var effId = effIds[i];
        var eff = effs[effId];
        if (eff.isMaster()) {
          return true;
        }
      }
      return false;
    }

    r.addEffect = function(type, options, gc, gp, id) {
      var ctrMap = {
        "dist" : r._Distortion
        // TODO: add more
      };

      var ctr;
      if (type === "mast") {
        if (masterAdded(r._song)) {
          return;
        }
        ctr = r._Master;
      } else {
        ctr = ctrMap[type];
      }

      if (notDefined(ctr)) {
        ctr = ctrMap["dist"];
      }

      var unnormalizeMap = ctr.prototype._unnormalizeMap;
      var unnormalized = Rhombus._map.unnormalizedParams(options, unnormalizeMap);
      var eff = new ctr(unnormalized);

      if (isNull(eff) || notDefined(eff)) {
        return;
      }

      if (isNull(id) || notDefined(id)) {
        r._newId(eff);
      } else {
        r._setId(eff, id);
      }

      eff._type = type;
      eff._currentParams = {};
      eff._trackParams(options);

      if (isDefined(gc)) {
        for (var i = 0; i < gc.length; i++) {
          gc[i] = +(gc[i]);
        }
        eff._graphChildren = gc;
      } else {
        r._toMaster(eff);
      }

      if (isDefined(gp)) {
        for (var i = 0; i < gp.length; i++) {
          gp[i] = +(gp[i]);
        }
        eff._graphParents = gp;
      }

      this._song._effects[eff._id] = eff;
      return eff._id;
    }

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

    function isMaster() { return false; }
 
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
   
    function installFunctions(ctr) {
      ctr.prototype._normalizedObjectSet = normalizedObjectSet;
      r._addParamFunctions(ctr);
      r._addGraphFunctions(ctr);
      ctr.prototype.toJSON = toJSON;
      ctr.prototype.isMaster = isMaster;
    }
    r._addEffectFunctions = installFunctions;

    function normalizedObjectSet(params, internal) {
      if (notObject(params)) {
        return;
      }

      if (!internal) {
        var rthis = this;
        var oldParams = this._currentParams;

        r.Undo._addUndoAction(function() {
          rthis._normalizedObjectSet(oldParams, true);
        });
      }
      this._trackParams(params);
      var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap);
      this.set(unnormalized);
    }

    // Parameter list interface
    function parameterCount() {
      return Rhombus._map.subtreeCount(this._unnormalizeMap);
    }

    function parameterName(paramIdx) {
      var name = Rhombus._map.getParameterName(this._unnormalizeMap, paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    }

    function normalizedSet(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(this._unnormalizeMap, paramIdx, paramValue);
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
