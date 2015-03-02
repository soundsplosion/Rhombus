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

    function graphConnect(B, outNum, inNum) {
      if (notNumber(inNum)) {
        inNum = 0;
      }
      if (notNumber(outNum)) {
        outNum = 0;
      }

      if (notDefined(this._graphChildren)) {
        this._graphChildren = [];
      }
      if (notDefined(B._graphParents)) {
        B._graphParents = [];
      }

      if (connectionExists(B, this)) {
        return false;
      }

      this._graphChildren[outNum] = B._id;
      B._graphParents[inNum] = this._id;

      this.connect(B, outNum, inNum);

      return true;
    };

    function graphDisconnect(outNum) {
      if (notNumber(outNum)) {
        outNum = 0;
      }

      if (notDefined(this._graphChildren)) {
        this._graphChildren = [];
      }

      var connectedTo = this._graphChildren[outNum];
      if (notDefined(connectedTo)) {
        return;
      }

      delete this._graphChildren[outNum];
      var inNum = connectedTo._graphParents.indexOf(this._id);
      delete connectedTo._graphParents[inNum];
    }

    function graphLookup(id) {
      var instr = r._song._instruments.getObjById(id);
      if (notUndefined(instr)) {
        return instr;
      }
      return r._song._effects[id];
    }

    function graphChildren() {
      if (notDefined(this._graphChildren)) {
        return [];
      }
      return this._graphChildren.filter(notUndefined).map(graphLookup);
    }

    function graphParents() {
      if (notDefined(this._graphParents)) {
        return [];
      }
      return this._graphParents.filter(notUndefined).map(graphLookup);
    }

    r._addGraphFunctions = function(ctr) {
      ctr.prototype.graphChildren = graphChildren;
      ctr.prototype.graphParents = graphParents;
      ctr.prototype.graphConnect = graphConnect;
      ctr.prototype.graphDisconnect = graphDisconnect;
    };

    r._toMaster = function(node) {
      var effects = r._song._effects;
      var master;
      var effectIds = Object.keys(effects);
      for (var idIdx in effectIds) {
        var effect = effects[effectIds[idIdx]];
        if (effect.isMaster()) {
          master = effect;
          break;
        }
      }

      if (notDefined(master)) {
        return;
      }

      node.graphconnect(master);
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
