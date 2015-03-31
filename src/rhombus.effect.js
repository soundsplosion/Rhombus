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

    r.effectTypes = function() {
      return ["dist", "filt", "eq", "dely", "comp", "gain", "bitc"];
    };

    r.effectDisplayNames = function() {
      return ["Distortion", "Filter", "EQ", "Delay", "Compressor", "Gain", "Bitcrusher"];
    };

    r.addEffect = function(type, options, gc, gp, id) {
      var ctrMap = {
        "dist" : r._Distortion,
        "filt" : r._Filter,
        "eq"   : r._EQ,
        "dely" : r._Delay,
        "comp" : r._Compressor,
        "gain" : r._Gainer,
        "bitc" : r._BitCrusher
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

      var eff = new ctr();

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

      var def = Rhombus._map.generateDefaultSetObj(eff._unnormalizeMap);
      eff._normalizedObjectSet(def, true);
      eff._normalizedObjectSet(options, true);

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

      var that = this;
      r.Undo._addUndoAction(function() {
        delete that._song._effects[eff._id];
      });

      this._song._effects[eff._id] = eff;

      eff.isInstrument = function() { return false; };
      eff.isEffect = function() { return true; };

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

      var that = this;
      var oldEffect = this._song._effects[id];
      r.Undo._addUndoAction(function() {
        // TODO: restore connections that came into/went out of this node
        this._song._effects[id] = oldEffect;
      });
      // TODO: break connections coming into/going out of this node
      delete this._song._effects[id];
    };

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
        var that = this;
        var oldParams = this._currentParams;
        r.Undo._addUndoAction(function() {
          that._normalizedObjectSet(oldParams, true);
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
