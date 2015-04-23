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

/*** Prevent the above comment from sticking here. */
Rhombus.prototype.effectTypes = function() {
  return ["dist", "filt", "eq", "dely", "comp", "gain", "bitc", "revb", "chor", "scpt"];
};

Rhombus.prototype.effectDisplayNames = function() {
  return ["Distortion", "Filter", "EQ", "Delay", "Compressor", "Gain", "Bitcrusher", "Reverb", "Chorus", "Script"];
};

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
    "dist" : this._Distortion,
    "filt" : this._Filter,
    "eq"   : this._EQ,
    "dely" : this._Delay,
    "comp" : this._Compressor,
    "gain" : this._Gainer,
    "bitc" : this._BitCrusher,
    "revb" : this._Reverb,
    "chor" : this._Chorus,
    "scpt" : this._Script
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
    if (masterAdded(this._song)) {
      return;
    }
    ctr = this._Master;
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

  if (ctr === this._Master) {
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

  var gi = Rhombus.Util.deepCopy(effect.graphInputs());
  var go = Rhombus.Util.deepCopy(effect.graphOutputs());
  this.Undo._addUndoAction(function() {
    this._song._effects[id] = effect;
    effect._restoreConnections(go, gi);
  });
  effect._removeConnections();
  delete this._song._effects[id];

  // exercise the nuclear option
  this.killAllNotes();
};

Rhombus.prototype._makeEffectMap = function(obj) {
  obj["dry/wet"] = [Rhombus._map.mapIdentity, Rhombus._map.rawDisplay, 1.0];
  obj["gain"] = [Rhombus._map.mapLinear(0, 2), Rhombus._map.rawDisplay, 1.0/2.0];
  return obj;
};

Rhombus.prototype._addEffectFunctions = function(ctr) {
  var rhombThis = this;
  function normalizedObjectSet(params, internal) {
    if (notObject(params)) {
      return;
    }

    if (!internal) {
      var that = this;
      var oldParams = this._currentParams;
      rhombThis.Undo._addUndoAction(function() {
        that._normalizedObjectSet(oldParams, true);
      });
    }
    this._trackParams(params);
    var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap);
    this.set(unnormalized);
  }

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
    return jsonVersion;
  }

  ctr.prototype._normalizedObjectSet = normalizedObjectSet;
  rhombThis._addParamFunctions(ctr);
  rhombThis._addGraphFunctions(ctr);
  rhombThis._addAudioNodeFunctions(ctr);
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
};
