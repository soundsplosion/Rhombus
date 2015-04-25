//! rhombus.audionode.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

// Code shared between instruments and nodes.

Rhombus._addAudioNodeFunctions = function(ctr) {
  function internalGraphConnect(output, b, bInput) {
    // TODO: use the slots when connecting
    var type = this._graphOutputs[output].type;
    if (type === "audio") {
      this.connect(b);
    } else if (type === "control") {
      // TODO: implement control routing
    }
  }
  ctr.prototype._internalGraphConnect = internalGraphConnect;

  function internalGraphDisconnect(output, b, bInput) {
    // TODO: use the slots when disconnecting
    var type = this._graphOutputs[output].type;
    if (type === "audio") {
      // TODO: this should be replaced in such a way that we
      // don't break all the outgoing connections every time we
      // disconnect from one thing. Put gain nodes in the middle
      // or something.
      console.log("removing audio connection");
      this.disconnect();
      var that = this;
      this._graphOutputs[output].to.forEach(function(port) {
        that.connect(this._r.graphLookup(port.node));
      });
    } else if (type === "control") {
      // TODO: implement control routing
      console.log("removing control connection");
    }
    else {
      console.log("removing unknown connection");
    }
  }
  ctr.prototype._internalGraphDisconnect = internalGraphDisconnect;

  // The default implementation changes volume.
  // Specific instruments and effects can handle this their own way.
  function setAutomationValueAtTime(value, time) {
    if (this.isInstrument() || this.isEffect()) {
      this.output.gain.setValueAtTime(value, time);
    }
  }
  ctr.prototype._setAutomationValueAtTime = setAutomationValueAtTime;
};
