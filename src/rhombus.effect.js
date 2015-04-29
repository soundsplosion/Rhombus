//! rhombus.effect.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

/**
 * An effect in the audio graph.
 * @name Effect
 * @interface
 * @memberof Rhombus
 * @implements {Rhombus.GraphNode}
 */

/**
 * @returns {Array} An array of all the possible effect strings that can be passed into {@link Rhombus#addEffect}.
 */
Rhombus.prototype.effectTypes = function() {
  return ["dist", "filt", "eq", "dely", "comp", "gain", "bitc", "revb", "chor", "scpt"];
};

/**
 * @returns {Array} An array of the strings to display in the UI for each effect type, parallel with {@link Rhombus#effectTypes}.
 */
Rhombus.prototype.effectDisplayNames = function() {
  return ["Distortion", "Filter", "EQ", "Delay", "Compressor", "Gain", "Bitcrusher", "Reverb", "Chorus", "Script"];
};

/**
 * Adds an effect of the given type to the current song.
 * @param {String} type A type from the array returned from {@link Rhombus#effectTypes}.
 * @returns {Number} The id of the newly added effect
 */
Rhombus.prototype.addEffect = function(type, json) {
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

  var ctrMap = {
    "dist" : Rhombus._Distortion,
    "filt" : Rhombus._Filter,
    "eq"   : Rhombus._EQ,
    "dely" : Rhombus._Delay,
    "comp" : Rhombus._Compressor,
    "gain" : Rhombus._Gainer,
    "bitc" : Rhombus._BitCrusher,
    "revb" : Rhombus._Reverb,
    "chor" : Rhombus._Chorus,
    "scpt" : Rhombus._Script
  };

  var options, go, gi, id, graphX, graphY, code;
  if (isDefined(json)) {
    options = json._params;
    go = json._graphOutputs;
    gi = json._graphInputs;
    id = json._id;
    graphX = json._graphX;
    graphY = json._graphY;
    code = json._code;
  }

  var ctr;
  if (type === "mast") {
    if (masterAdded(this._song)) {
      return;
    }
    ctr = Rhombus._Master;
  } else {
    ctr = ctrMap[type];
  }

  if (notDefined(ctr)) {
    ctr = ctrMap["dist"];
  }

  var eff;
  if (isDefined(code)) {
    eff = new ctr(code);
  } else {
    eff = new ctr();
  }

  if (isNull(eff) || notDefined(eff)) {
    return;
  }

  eff._r = this;
  eff.setGraphX(graphX);
  eff.setGraphY(graphY);

  if (isNull(id) || notDefined(id)) {
    this._newId(eff);
  } else {
    this._setId(eff, id);
  }

  eff._type = type;
  eff._currentParams = {};
  eff._trackParams(options);

  var def = Rhombus._map.generateDefaultSetObj(eff._unnormalizeMap);
  eff._normalizedObjectSet(def, true);
  eff._normalizedObjectSet(options, true);

  if (ctr === Rhombus._Master) {
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
  var effects = this._song._effects;
  this.Undo._addUndoAction(function() {
    delete effects[eff._id];
  });

  effects[eff._id] = eff;

  eff._graphType = "effect";

  return eff._id;
};

/**
 * Removes the effect with the given id from the current song.
 * The master effect cannot be removed.
 *
 * @param {Rhombus.Effect|Number} effectOrId The effect to remove, or its id.
 * @returns {Boolean} true if the effect was in the song, false otherwise
 */
Rhombus.prototype.removeEffect = function(effectOrId) {
  function inToId(effectOrId) {
    var id;
    if (typeof effectOrId === "object") {
      id = effectOrId._id;
    } else {
      id = +effectOrId;
    }
    return id;
  }

  var id = inToId(effectOrId);
  if (id < 0) {
    return;
  }

  var effect = this._song._effects[id];
  if (effect.isMaster()) {
    return;
  }

  var gi = effect.graphInputs();
  var go = effect.graphOutputs();
  var that = this;
  this.Undo._addUndoAction(function() {
    that._song._effects[id] = effect;
    effect._restoreConnections(go, gi);
  });
  effect._removeConnections();
  delete this._song._effects[id];

  // exercise the nuclear option
  this.killAllNotes();
};

Rhombus._makeEffectMap = function(obj) {
  var newObj = Rhombus._makeAudioNodeMap(obj);
  for (var key in obj) {
    newObj[key] = obj[key];
  }
  newObj["dry/wet"] = [Rhombus._map.mapIdentity, Rhombus._map.rawDisplay, 1.0];
  newObj["gain"] = [Rhombus._map.mapLinear(0, 2), Rhombus._map.rawDisplay, 1.0/2.0];
  return newObj;
};

Rhombus._addEffectFunctions = function(ctr) {
  function normalizedObjectSet(params, internal) {
    if (notObject(params)) {
      return;
    }

    if (!internal) {
      var that = this;
      var oldParams = this._currentParams;
      this._r.Undo._addUndoAction(function() {
        that._normalizedObjectSet(oldParams, true);
      });
    }
    this._trackParams(params);
    var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap);
    this.set(unnormalized);
  }

  /**
   * @returns {Boolean} true if this effect is the master effect, false otherwise.
   * @memberof Rhombus.Effect.prototype
   */
  function isMaster() {
    return false;
  }

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
    if (isDefined(this._code)) {
      jsonVersion._code = this._code;
    }
    return jsonVersion;
  }

  ctr.prototype._normalizedObjectSet = normalizedObjectSet;
  Rhombus._addParamFunctions(ctr);
  Rhombus._addGraphFunctions(ctr);
  Rhombus._addAudioNodeFunctions(ctr);
  ctr.prototype.toJSON = toJSON;
  ctr.prototype.isMaster = isMaster;

  // Swizzle out the set method for one that does gain + dry/wet.
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

  ctr.prototype._setAutomationValueAtTime = function(value, time) {
    var base = this._currentParams.gain;
    var finalNormalized = this._getAutomationModulatedValue(base, value);
    var finalVal = this._unnormalizeMap.gain[0](finalNormalized);
    this.output.gain.setValueAtTime(finalVal, time);
  }
};
