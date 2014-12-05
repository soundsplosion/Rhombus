//! rhombus.header.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(root) {

  // Audio Context shim stuff
  var AudioContext = root.webkitAudioContext || root.AudioContext;
  if (!AudioContext) {
    throw new Error("No Web Audio API support - cannot initialize Rhombus.");
  }

  // Install Rhombus object
  var r = {};
  root.Rhombus = r;

  var ctx = new AudioContext();
  Object.defineProperty(r, '_ctx', {
    value: ctx
  });

  var curId = 0;
  r._setId = function(t, id) {
    if (id >= curId) {
      curId = id + 1;
    }

    Object.defineProperty(t, 'id', {
      value: id,
      enumerable: true
    });
  };

  r._newId = function(t) {
    r._setId(t, curId);
    curId++;
  };

})(this);
