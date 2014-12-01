//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(r) {

  r.Note = function(pitch, start, length) {
    // TODO: check implementation, and add more fields (?)
    this._pitch = pitch || 60;
    this._start = start || 0;
    this._length = length || 0;
  };

  r.Note.prototype = {
    getPitch: function() {
      return this._pitch;
    },

    setPitch: function(pitch) {
      // TODO: impl
    },

    getStart: function() {
      return this._start;
    },

    setStart: function (start) {
      // TODO: impl
    },

    getLength: function() {
      return this._length;
    },

    setLength: function(length) {
      // TODO: impl
    },

    delete: function(length) {
      // TODO: impl
    }
  };

  r._song = {};
  var song = r._song;

  // List of notes?
  song.notes = {};

  r.getNoteCount = function() {
    // TODO: impl
  };

  r.getNote = function(index) {
    // TODO: impl
  };

  r.insertNote = function(note) {
    // TODO: impl
  };

})(this.Rhombus);
