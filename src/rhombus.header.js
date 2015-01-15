//! rhombus.header.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(root) {

  // Audio Context shim stuff
  var AudioContext = root.webkitAudioContext || root.AudioContext;
  if (!AudioContext) {
    throw new Error("No Web Audio API support - cannot initialize Rhombus.");
  }

  // Add Rhombus constructor
  root.Rhombus = function() {

    var ctx = new AudioContext();
    Object.defineProperty(this, '_ctx', {
      value: ctx
    });

    var curId = 0;
    this._setId = function(t, id) {
      if (id >= curId) {
        curId = id + 1;
      }

      Object.defineProperty(t, 'id', {
        value: id,
        enumerable: true
      });
    };

    this._newId = function(t) {
      this._setId(t, curId);
    };

    root.Rhombus._graphSetup(this);
    root.Rhombus._instrumentSetup(this);
    root.Rhombus._songSetup(this);
    root.Rhombus._timeSetup(this);
    root.Rhombus._editSetup(this);
  };

})(this);
