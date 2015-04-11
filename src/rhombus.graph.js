//! rhombus.graph.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  function Port(node, slot) {
    this.node = node;
    this.slot = slot;
  }

  function numberifyOutputs(go) {
    for (var i = 0; i < go.length; i++) {
      var output = go[i];
      for (var j = 0; j < output.to.length; j++) {
        var port = output.to[j];
        port.node = +(port.node);
        port.slot = +(port.slot);
      }
    }
  }

  function numberifyInputs(gi) {
    for (var i = 0; i < gi.length; i++) {
      var input = gi[i];
      for (var j = 0; j < input.from.length; j++) {
        var port = input.from[j];
        port.node = +(port.node);
        port.slot = +(port.slot);
      }
    }
  }

  Rhombus.Util.numberifyOutputs = numberifyOutputs;
  Rhombus.Util.numberifyInputs = numberifyInputs;

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


  Rhombus._graphSetup = function(r) {

    function graphLookup(id) {
      var instr = r._song._instruments.getObjById(id);
      if (isDefined(instr)) {
        return instr;
      }
      return r._song._effects[id];
    }
    r.graphLookup = graphLookup;

    function graphInputs() {
      function getRealNodes(input) {
        var newInput = {};
        newInput.type = input.type;
        newInput.from = input.from.map(function (port) {
          return new Port(graphLookup(port.node), port.slot);
        });
        return newInput;
      }

      return this._graphInputs.map(getRealNodes);
    }

    function graphOutputs() {
      function getRealNodes(output) {
        var newOutput = {};
        newOutput.type = output.type;
        newOutput.to = output.to.map(function (port) {
          return new Port(graphLookup(port.node), port.slot);
        });
        return newOutput;
      }

      return this._graphOutputs.map(getRealNodes);
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

      if (connectionExists(this, output, b, bInput)) {
        return false;
      }

      if (!internal) {
        var that = this;
        r.Undo._addUndoAction(function() {
          that.graphDisconnect(output, b, bInput, true);
        });
      }

      outputObj.to.push(new Port(b._id, bInput));
      inputObj.from.push(new Port(this._id, output));

      // TODO: use the slots when connecting
      var type = outputObj.type;
      if (type === "audio") {
        this.connect(b);
      } else if (type === "control") {
        // TODO: implement control routing
      }
      return true;
    };

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
        r.Undo._addUndoAction(function() {
          that.graphConnect(output, b, bInput, true);
        });
      }

      outputObj.to.splice(outputPortIdx, 1);
      inputObj.from.splice(inputPortIdx, 1);

      // TODO: use the slots when disconnecting
      var type = outputObj.type;
      if (type === "audio") {
        // TODO: this should be replaced in such a way that we
        // don't break all the outgoing connections every time we
        // disconnect from one thing. Put gain nodes in the middle
        // or something.
        this.disconnect();
        var that = this;
        outputObj.to.forEach(function (port) {
          that.connect(graphLookup(port.node));
        });
      } else if (type === "control") {
        // TODO: implement control routing
      }
    }

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
          var port = input.from[i];
          port.node.graphConnect(port.slot, this, inputIdx, true);
        }
      }

      for (var outputIdx = 0; outputIdx < go.length; outputIdx++) {
        var output = go[outputIdx];
        for (var portIdx = 0; portIdx < output.to.length; portIdx++) {
          var port = output.to[i];
          this.graphConnect(outputIdx, port.node, port.slot, true);
        }
      }
    }

    r._addGraphFunctions = function(ctr) {
      ctr.prototype._graphSetup = graphSetup;
      ctr.prototype.graphInputs = graphInputs;
      ctr.prototype.graphOutputs = graphOutputs;
      ctr.prototype.graphConnect = graphConnect;
      ctr.prototype.graphDisconnect = graphDisconnect;
      ctr.prototype.connectionExists = connectionExists;
      ctr.prototype._removeConnections = removeConnections;
      ctr.prototype._restoreConnections = restoreConnections;
      ctr.prototype.graphX = graphX;
      ctr.prototype.setGraphX = setGraphX;
      ctr.prototype.graphY = graphY;
      ctr.prototype.setGraphY = setGraphY;
    };

    r.getMaster = function() {
      var effects = r._song._effects;
      var effectIds = Object.keys(effects);
      for (var idIdx in effectIds) {
        var effect = effects[effectIds[idIdx]];
        if (effect.isMaster()) {
          return effect;
        }
      }
      return undefined;
    }

    r._toMaster = function(node) {
      var master = this.getMaster();

      if (notDefined(master)) {
        return;
      }

      // TODO: get these slots right
      node.graphConnect(0, master, 0, true);
    };

    r._importFixGraph = function() {
      var instrIds = this._song._instruments.objIds();
      var effIds = Object.keys(this._song._effects);
      var nodeIds = instrIds.concat(effIds);
      var nodes = nodeIds.map(graphLookup);

      nodes.forEach(function (node) {
        var go = node.graphOutputs();
        go.forEach(function (slot) {
          slot.to.forEach(function (port) {
            // TODO: use the slots here too
            node.connect(port.node);
          });
        });
      });
    };

    r.getNodeById = function(nodeId) {
      var effect = this._song._effects[nodeId];
      var inst   = this._song._instruments.getObjById(nodeId);

      if (isDefined(effect)) {
        return effect;
      }
      if (isDefined(inst)) {
        return inst;
      }

      return undefined;
    };

  };
})(this.Rhombus);
