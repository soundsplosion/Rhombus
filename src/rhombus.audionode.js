//! rhombus.audionode.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {

  // Code shared between instruments and nodes.

  Rhombus._audioNodeSetup = function(r) {

    function internalGraphConnect(output, b, bInput) {
      // TODO: use the slots when connecting
      var type = this._graphOutputs[output].type;
      if (type === "audio") {
        this.connect(b);
      } else if (type === "control") {
        // TODO: implement control routing
      }
    }

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
          that.connect(r.graphLookup(port.node));
        });
      } else if (type === "control") {
        // TODO: implement control routing
        console.log("removing control connection");
      }
      else {
        console.log("removing unknown connection");
      }
    }

    r._addAudioNodeFunctions = function(ctr) {
      ctr.prototype._internalGraphConnect = internalGraphConnect;
      ctr.prototype._internalGraphDisconnect = internalGraphDisconnect;
    };

  };
})(this.Rhombus);
