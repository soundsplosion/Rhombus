//! rhombus.graph.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  Rhombus._graphSetup = function(r) {

    function connectionExists(a, b) {
      function cycleProof(a, b, seen) {
        if (a._id === b._id) {
          return true;
        }

        var newSeen = seen.slice(0);
        newSeen.push(a);

        var inAny = false;
        a.graphChildren().forEach(function(child) {
          if (newSeen.indexOf(child) !== -1) {
            return;
          }
          inAny = inAny || cycleProof(child, b, newSeen);
        });

        return inAny;
      }

      return cycleProof(a, b, []);
    }

    function hasChild(B) {
      for (var i = 0; i < this._graphChildren.length; i++) {
        if (this._graphChildren[i] === B._id) {
          return true;
        }
      }
      return false;
    }

    function hasParent(A) {
      return A.hasChild(this);
    }

    function hasDescendant(B) {
      return connectionExists(this, B);
    }

    function hasAncestor(A) {
      return A.hasDescendant(this);
    }

    function graphConnect(B, internal) {
      if (notDefined(this._graphChildren)) {
        this._graphChildren = [];
      }
      if (notDefined(B._graphParents)) {
        B._graphParents = [];
      }

      // Don't allow cycles
      if (connectionExists(B, this)) {
        return false;
      }

      // Don't allow multiple connections to the same object
      if (this.hasChild(B)) {
        return false;
      }

      if (!internal) {
        var that = this;
        r.Undo._addUndoAction(function() {
          that.graphDisconnect(B, true);
        });
      }

      this._graphChildren.push(B._id);
      B._graphParents.push(this._id);

      this.connect(B);
      return true;
    };

    function graphDisconnect(B, internal) {
      if (notDefined(this._graphChildren)) {
        this._graphChildren = [];
        return;
      }

      var idx = this._graphChildren.indexOf(B._id);
      if (idx === -1) {
        return;
      }

      this._graphChildren.splice(idx, 1);

      var BIdx = B._graphParents.indexOf(this._id);
      if (BIdx !== -1) {
        B._graphParents.splice(BIdx, 1);
      }

      if (!internal) {
        var that = this;
        r.Undo._addUndoAction(function() {
          that.graphConnect(B, true);
        });
      }

      // TODO: this should be replaced in such a way that we
      // don't break all the outgoing connections every time we
      // disconnect from one thing. Put gain nodes in the middle
      // or something.
      this.disconnect();
      var that = this;
      this._graphChildren.forEach(function(idx) {
        var child = graphLookup(idx);
        if (isDefined(child)) {
          that.connect(child);
        }
      });
    }

    function graphLookup(id) {
      var instr = r._song._instruments.getObjById(id);
      if (isDefined(instr)) {
        return instr;
      }
      return r._song._effects[id];
    }
    r.graphLookup = graphLookup;

    function graphChildren() {
      if (notDefined(this._graphChildren)) {
        return [];
      }
      return this._graphChildren.filter(isDefined).map(graphLookup);
    }

    function graphParents() {
      if (notDefined(this._graphParents)) {
        return [];
      }
      return this._graphParents.filter(isDefined).map(graphLookup);
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
      var gc = this.graphChildren();
      var gp = this.graphParents();
      for (var i = 0; i < gc.length; i++) {
        instr.graphDisconnect(gc[i], true);
      }
      for (var i = 0; i < gp.length; i++) {
        gp[i].graphDisconnect(instr, true);
      }
    }

    function restoreConnections(gc, gp) {
      for (var i = 0; i < gp.length; i++) {
        gp[i].graphConnect(instr, true);
      }
      for (var i = 0; i < gc.length; i++) {
        instr.graphConnect(gc[i], true);
      }
    }

    r._addGraphFunctions = function(ctr) {
      ctr.prototype.hasChild = hasChild;
      ctr.prototype.hasParent = hasParent;
      ctr.prototype.hasAncestor = hasAncestor;
      ctr.prototype.hasDescendant = hasDescendant;
      ctr.prototype.graphChildren = graphChildren;
      ctr.prototype.graphParents = graphParents;
      ctr.prototype.graphConnect = graphConnect;
      ctr.prototype.graphDisconnect = graphDisconnect;
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

      node.graphConnect(master, true);
    };

    r._importFixGraph = function() {
      var instruments = this._song._instruments;
      instruments.objIds().forEach(function(id) {
        var instr = instruments.getObjById(id);
        instr.graphChildren().forEach(function(child) {
          instr.connect(child);
        });
      });
      var effects = this._song._effects;
      for (var effectId in effects) {
        var effect = effects[effectId];
        effect.graphChildren().forEach(function(child) {
          effect.connect(child);
        });
      }
    };

    // Set up the audio graph
    // Hardcoded effect for now
    var graph = {};

    var enabled = false;
    r.getEffectEnabled = function() {
      return enabled;
    };

    var inGain = r._ctx.createGain();
    var delay = r._ctx.createDelay();
    delay.delayTime.value = 3/8;

    var feedbackGain = r._ctx.createGain();
    feedbackGain.gain.value = 0.4;

    var masterOutGain = r._ctx.createGain();
    r.getMasterGain = function() {
      return masterOutGain.gain.value;
    };
    r.setMasterGain = function(gain) {
      masterOutGain.gain.linearRampToValueAtTime(gain, r._ctx.currentTime + 0.1);
    };

    // controls the amount of dry signal going to the output
    var dryGain = r._ctx.createGain();
    dryGain.gain.value = 1.0;

    // controls the how much of the input is fed to the delay
    // currently used to toggle the effect on or off
    var preGain = r._ctx.createGain();

    // controls the amount of wet signal going to the output
    var wetGain = r._ctx.createGain();
    wetGain.gain.value = 0.4;

    r.getWetGain = function () {
      return wetGain.gain.value;;
    };
    r.setWetGain = function(gain) {
      wetGain.gain.linearRampToValueAtTime(gain, r._ctx.currentTime + 0.1);
    };

    // this controls the feedback amount
    r.getFeedbackGain = function () {
      return feedbackGain.gain.value;
    };
    r.setFeedbackGain = function(gain) {
      feedbackGain.gain.linearRampToValueAtTime(gain, this._ctx.currentTime + 0.1);
    };

    // direct signal control
    inGain.connect(dryGain);
    dryGain.connect(masterOutGain);

    // shut of input to the delay when the effect is disabled
    inGain.connect(preGain);

    // feedback control
    delay.connect(feedbackGain);
    feedbackGain.connect(delay);

    // effect level control
    preGain.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(masterOutGain);

    masterOutGain.connect(r._ctx.destination);

    graph.mainout = inGain;
    r._graph = graph;

    var on = false;
    r.isEffectOn = function() {
      return on;
    };

    r.setEffectOn = function(enable) {
      if (enable) {
        enabled = true;
        preGain.gain.linearRampToValueAtTime(1.0, this._ctx.currentTime + 0.1);
      } else {
        enabled = false;
        preGain.gain.linearRampToValueAtTime(0.0, this._ctx.currentTime + 0.1);
      }
    };

    // disable effect by default
    r.setEffectOn(false);
  };
})(this.Rhombus);
