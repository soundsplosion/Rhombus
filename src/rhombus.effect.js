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
      return ["dist", "filt", "eq", "dely", "comp", "gain", "bitc", "revb", "chor", "scpt"];
    };

    r.effectDisplayNames = function() {
      return ["Distortion", "Filter", "EQ", "Delay", "Compressor", "Gain", "Bitcrusher", "Reverb", "Chorus", "Script"];
    };

    r.addEffect = function(type, json) {
      var ctrMap = {
        "dist" : r._Distortion,
        "filt" : r._Filter,
        "eq"   : r._EQ,
        "dely" : r._Delay,
        "comp" : r._Compressor,
        "gain" : r._Gainer,
        "bitc" : r._BitCrusher,
        "revb" : r._Reverb,
        "chor" : r._Chorus,
        "scpt" : r._Script
      };

      var options, go, gi, id, graphX, graphY;
      if (isDefined(json)) {
        options = json._params;
        go = json._graphOutputs;
        gi = json._graphInputs;
        id = json._id;
        graphX = json._graphX;
        graphY = json._graphY;
      }

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

      eff.setGraphX(graphX);
      eff.setGraphY(graphY);

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

      if (ctr === r._Master) {
        eff._graphSetup(1, 1, 0, 0);
      } else {
        eff._graphSetup(1, 1, 1, 0);
      }

      if (isDefined(go)) {
        Rhombus.Util.numberifyOutputs(go);
        eff._graphOutputs = go;
      }

      if (isDefined(gi)) {
        Rhombus.Util.numberifyInputs(gi);
        eff._graphInputs = gi;
      }

      var that = this;
      r.Undo._addUndoAction(function() {
        delete that._song._effects[eff._id];
      });

      this._song._effects[eff._id] = eff;

      eff._graphType = "effect";

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
      var effect = this._song._effects[id];
      if (effect.isMaster()) {
        return;
      }

      var gi = Rhombus.Util.deepCopy(effect.graphInputs());
      var go = Rhombus.Util.deepCopy(effect.graphOutputs());
      r.Undo._addUndoAction(function() {
        this._song._effects[id] = effect;
        effect._restoreConnections(go, gi);
      });
      effect._removeConnections();
      delete this._song._effects[id];

      // exercise the nuclear option
      r.killAllNotes();
    };

    function isMaster() { return false; }

    function toJSON(params) {
      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams,
        "_graphOutputs": this._graphOutputs,
        "_graphInputs": this._graphInputs,
        "_graphX": this._graphX,
        "_graphY": this._graphY
      };
      return jsonVersion;
    }

    function installFunctions(ctr) {
      ctr.prototype._normalizedObjectSet = normalizedObjectSet;
      r._addParamFunctions(ctr);
      r._addGraphFunctions(ctr);
      r._addAudioNodeFunctions(ctr);
      ctr.prototype.toJSON = toJSON;
      ctr.prototype.isMaster = isMaster;

      // Swizzle out the set method for one that does gain.
      var oldSet = ctr.prototype.set;
      ctr.prototype.set = function(options) {
        oldSet.apply(this, arguments);
        if (isDefined(options)) {
          if (isDefined(options.gain)) {
            this.output.gain.value = options.gain;
          }

          if (isDefined(options["dry/wet"])) {
            this.setWet(options["dry/wet"]);
          }
        }
      };
    }
    r._addEffectFunctions = installFunctions;

    function makeEffectMap(obj) {
      obj["dry/wet"] = [Rhombus._map.mapIdentity, Rhombus._map.rawDisplay, 1.0];
      obj["gain"] = [Rhombus._map.mapLinear(0, 2), Rhombus._map.rawDisplay, 1.0/2.0];
      return obj;
    }

    r._makeEffectMap = makeEffectMap;

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
