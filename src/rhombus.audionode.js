//! rhombus.audionode.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

// Code shared between instruments and nodes.

Rhombus._addAudioNodeFunctions = function(ctr) {
  function internalGraphConnect(output, b, bInput) {
    // TODO: use the slots when connecting
    var type = this._graphOutputs[output].type;
    var connector = this.isInstrument() ? this._rhombusStereo : this;

    if (type === "audio") {
      connector.connect(b);
    }
  }
  ctr.prototype._internalGraphConnect = internalGraphConnect;

  function internalGraphDisconnect(output, b, bInput) {
    // TODO: use the slots when disconnecting
    var type = this._graphOutputs[output].type;
    var connector = this.isInstrument() ? this._rhombusStereo : this;
    if (type === "audio") {
      // TODO: this should be replaced in such a way that we
      // don't break all the outgoing connections every time we
      // disconnect from one thing. Put gain nodes in the middle
      // or something.

      console.log("removing audio connection");
      connector.disconnect();
      var that = this;
      this._graphOutputs[output].to.forEach(function(port) {
        connector.connect(that._r.graphLookup(port.node));
      });
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

  function getAutomationModulatedValue(base, automation) {
    var delta = this._currentParams.automation.depth * 2.0 * (automation - 0.5);
    var preClamp = base + delta;
    if (preClamp < 0.0) {
      preClamp = 0.0;
    } else if (preClamp > 1.0) {
      preClamp = 1.0;
    }
    return preClamp;
  }

  ctr.prototype._getAutomationModulatedValue = getAutomationModulatedValue;
};

Rhombus._makeAudioNodeMap = function(obj) {
  var newObj = {};
  for (var key in obj) {
    newObj[key] = obj[key];
  }
  newObj.automation = {};
  newObj.automation.depth = [Rhombus._map.mapIdentity, Rhombus._map.rawDisplay, 0];
  return newObj;
};
