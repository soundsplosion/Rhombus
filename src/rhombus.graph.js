//! rhombus.graph.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus._makePort = function(node, slot) {
  var toRet = {};
  toRet.node = node;
  toRet.slot = slot;
  return toRet;
};

Rhombus.Util.numberifyOutputs = function(go) {
  for (var i = 0; i < go.length; i++) {
    var output = go[i];
    for (var j = 0; j < output.to.length; j++) {
      var port = output.to[j];
      port.node = +(port.node);
      port.slot = +(port.slot);
    }
  }
};

Rhombus.Util.numberifyInputs = function(gi) {
  for (var i = 0; i < gi.length; i++) {
    var input = gi[i];
    for (var j = 0; j < input.from.length; j++) {
      var port = input.from[j];
      port.node = +(port.node);
      port.slot = +(port.slot);
    }
  }
};

Rhombus.prototype.graphLookup = function(id) {
  var instr = this._song._instruments.getObjById(id);
  if (isDefined(instr)) {
    return instr;
  }
  var track = this._song._tracks.getObjById(id);
  if (isDefined(track)) {
    return track;
  }
  return this._song._effects[id];
}

Rhombus._addGraphFunctions = function(ctr) {
  function graphSetup(audioIn, controlIn, audioOut, controlOut) {
    this._graphInputs = [];
    this._graphOutputs = [];

    for (var i = 0; i < audioIn; i++) {
      this._graphInputs.push({type: "audio", from: []});
    }
    for (var i = 0; i < controlIn; i++) {
      this._graphInputs.push({type: "control", from: []});
    }
    for (var i = 0; i < audioOut; i++) {
      this._graphOutputs.push({type: "audio", to: []});
    }
    for (var i = 0; i < controlOut; i++) {
      this._graphOutputs.push({type: "control", to: []});
    }
  }
  ctr.prototype._graphSetup = graphSetup;


  function graphInputs() {
    var that = this;
    function getRealNodes(input) {
      var newInput = {};
      newInput.type = input.type;
      newInput.from = input.from.map(function (port) {
        return Rhombus._makePort(that._r.graphLookup(port.node), port.slot);
      });
      return newInput;
    }

    return this._graphInputs.map(getRealNodes);
  }
  ctr.prototype.graphInputs = graphInputs;

  function graphOutputs() {
    var that = this;
    function getRealNodes(output) {
      var newOutput = {};
      newOutput.type = output.type;
      newOutput.to = output.to.map(function (port) {
        return Rhombus._makePort(that._r.graphLookup(port.node), port.slot);
      });
      return newOutput;
    }

    return this._graphOutputs.map(getRealNodes);
  }
  ctr.prototype.graphOutputs = graphOutputs;

  function graphConnect(output, b, bInput, internal) {
    if (output < 0 || output >= this._graphOutputs.length) {
      return false;
    }
    if (bInput < 0 || bInput >= b._graphInputs.length) {
      return false;
    }

    var outputObj = this._graphOutputs[output];
    var inputObj = b._graphInputs[bInput];
    if (outputObj.type !== inputObj.type) {
      return false;
    }

    if (existsPathFrom(b, this)) {
      return false;
    }

    if (this.connectionExists(this, output, b, bInput)) {
      return false;
    }

    if (!internal) {
      var that = this;
      this._r.Undo._addUndoAction(function() {
        that.graphDisconnect(output, b, bInput, true);
      });
    }

    outputObj.to.push(Rhombus._makePort(b._id, bInput));
    inputObj.from.push(Rhombus._makePort(this._id, output));

    this._internalGraphConnect(output, b, bInput);
    return true;
  };
  ctr.prototype.graphConnect = graphConnect;

  function graphDisconnect(output, b, bInput, internal) {
    if (output < 0 || output >= this._graphOutputs.length) {
      return false;
    }
    if (bInput < 0 || bInput >= b._graphInputs.length) {
      return false;
    }

    var outputObj = this._graphOutputs[output];
    var inputObj = b._graphInputs[bInput];

    var outputPortIdx = -1;
    var inputPortIdx = -1;
    for (var i = 0; i < outputObj.to.length; i++) {
      var port = outputObj.to[i];
      if (port.node === b._id && port.slot === bInput) {
        outputPortIdx = i;
        break;
      }
    }

    for (var i = 0; i < inputObj.from.length; i++) {
      var port = inputObj.from[i];
      if (port.node === this._id && port.slot === output) {
        inputPortIdx = i;
        break;
      }
    }

    if (outputPortIdx === -1 || inputPortIdx === -1) {
      return false;
    }

    if (!internal) {
      var that = this;
      this._r.Undo._addUndoAction(function() {
        that.graphConnect(output, b, bInput, true);
      });
    }

    outputObj.to.splice(outputPortIdx, 1);
    inputObj.from.splice(inputPortIdx, 1);

    this._internalGraphDisconnect(output, b, bInput);
  }
  ctr.prototype.graphDisconnect = graphDisconnect;

  function existsPathFrom(from, to) {
    function existsPathRecursive(a, b, seen) {
      if (a._id === b._id) {
        return true;
      }

      var newSeen = seen.slice(0);
      newSeen.push(a);

      var inAny = false;
      var outputs = a.graphOutputs();

      for (var outputIdx = 0; outputIdx < outputs.length; outputIdx++) {
        var output = outputs[outputIdx];
        for (var portIdx = 0; portIdx < output.to.length; portIdx++) {
          var port = output.to[portIdx];
          if (newSeen.indexOf(port.node) !== -1) {
            continue;
          }
          inAny = inAny || existsPathRecursive(port.node, b, newSeen);
        }
      }

      return inAny;
    }

    return existsPathRecursive(from, to, []);
  }

  function connectionExists(a, output, b, input) {
    var ports = a._graphOutputs[output].to;
    for (var i = 0; i < ports.length; i++) {
      var port = ports[i];
      if (port.node === b._id && port.slot === input) {
        return true;
      }
    }
    return false;
  }
  ctr.prototype.connectionExists = connectionExists;

  function removeConnections() {
    var go = this.graphOutputs();
    for (var outputIdx = 0; outputIdx < go.length; outputIdx++) {
      var output = go[outputIdx];
      for (var portIdx = 0; portIdx < output.to.length; portIdx++) {
        var port = output.to[portIdx];
        this.graphDisconnect(outputIdx, port.node, port.slot, true);
      }
    }
    var gi = this.graphInputs();
    for (var inputIdx = 0; inputIdx < gi.length; inputIdx++) {
      var input = gi[inputIdx];
      for (var portIdx = 0; portIdx < input.from.length; portIdx++) {
        var port = input.from[portIdx];
        port.node.graphDisconnect(port.slot, this, inputIdx, true);
      }
    }
  }

  function restoreConnections(go, gi) {
    for (var inputIdx = 0; inputIdx < gi.length; inputIdx++) {
      var input = gi[inputIdx];
      for (var portIdx = 0; portIdx < input.from.length; portIdx++) {
        var port = input.from[portIdx];
        port.node.graphConnect(port.slot, this, inputIdx, true);
      }
    }

    for (var outputIdx = 0; outputIdx < go.length; outputIdx++) {
      var output = go[outputIdx];
      for (var portIdx = 0; portIdx < output.to.length; portIdx++) {
        var port = output.to[portIdx];
        this.graphConnect(outputIdx, port.node, port.slot, true);
      }
    }
  }
  ctr.prototype._removeConnections = removeConnections;
  ctr.prototype._restoreConnections = restoreConnections;

  function graphX() {
    if (notNumber(this._graphX)) {
      this._graphX = 0;
    }
    return this._graphX;
  }

  function setGraphX(x) {
    if (isNumber(x)) {
      this._graphX = x;
    }
  }

  function graphY() {
    if (notNumber(this._graphY)) {
      this._graphY = 0;
    }
    return this._graphY;
  }

  function setGraphY(y) {
    if (isNumber(y)) {
      this._graphY = y;
    }
  }
  ctr.prototype.graphX = graphX;
  ctr.prototype.setGraphX = setGraphX;
  ctr.prototype.graphY = graphY;
  ctr.prototype.setGraphY = setGraphY;
  

  function isEffect() {
    return this._graphType === "effect";
  }
  ctr.prototype.isEffect = isEffect;

  function isInstrument() {
    return this._graphType === "instrument";
  }
  ctr.prototype.isInstrument = isInstrument;

  function isTrack() {
    return this._graphType === "track";
  }
  ctr.prototype.isTrack = isTrack;
};

Rhombus.prototype.getMaster = function() {
  var effects = this._song._effects;
  var effectIds = Object.keys(effects);
  for (var idIdx in effectIds) {
    var effect = effects[effectIds[idIdx]];
    if (effect.isMaster()) {
      return effect;
    }
  }
  return undefined;
};

Rhombus.prototype._toMaster = function(node) {
  var master = this.getMaster();

  if (notDefined(master)) {
    return;
  }

  node.graphConnect(0, master, 0, true);
};

Rhombus.prototype._importFixGraph = function() {
  function backwardsConnectionExists(a, output, b, input) {
    var ports = b._graphInputs[input].from;
    for (var i = 0; i < ports.length; i++) {
      var port = ports[i];
      if (port.node === a._id && port.slot === output) {
        return true;
      }
    }
    return false;
  }

  var trackIds = this._song._tracks.objIds();
  var instrIds = this._song._instruments.objIds();
  var effIds = Object.keys(this._song._effects);
  var nodeIds = trackIds.concat(instrIds).concat(effIds);

  var that = this;
  var nodes = nodeIds.map(function(id) {
    return that.graphLookup(id);
  });

  nodes.forEach(function (node) {
    var gi = node.graphInputs();
    var go = node.graphOutputs();

    // First, verify the graph integrity.
    // If any half-connections exist, get rid of them.
    for (var outIdx = 0; outIdx < go.length; outIdx++) {
      var out = go[outIdx];
      for (var portIdx = 0; portIdx < out.to.length; portIdx++) {
        var port = out.to[portIdx];
        if (!backwardsConnectionExists(node, outIdx, port.node, port.slot)) {
          node._graphOutputs[outIdx].to.splice(portIdx, 1);
        }
      }
    }

    for (var inIdx = 0; inIdx < gi.length; inIdx++) {
      var inp = gi[inIdx];
      for (var portIdx = 0; portIdx < inp.from.length; portIdx++) {
        var port = inp.from[portIdx];
        if (!port.node.connectionExists(port.node, port.slot, node, inIdx)) {
          node._graphInputs[inIdx].from.splice(portIdx, 1);
        }
      }
    }

    // Now, actually do the connecting.
    for (var outIdx = 0; outIdx < go.length; outIdx++) {
      var out = go[outIdx];
      for (var portIdx = 0; portIdx < out.to.length; portIdx++) {
        var port = out.to[portIdx];
        node._internalGraphConnect(outIdx, port.node, port.slot);
      }
    }
  });
};

Rhombus.prototype.getNodeById = Rhombus.prototype.graphLookup;
