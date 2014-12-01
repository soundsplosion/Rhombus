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
  song.notes = new Array();

  function appendArp(p1, p2, p3) {
    // sixteenth note length
    var interval = 240;
    var startTime;
    if (song.notes.length === 0) {
      startTime = 960;
    } else {
      startTime = song.notes[song.notes.length-1].getStart() + interval;
    }

    song.notes.push(new r.Note(p1, startTime, interval*2));
    song.notes.push(new r.Note(p2, startTime + interval, interval*2));
    song.notes.push(new r.Note(p3, startTime + interval*2, interval*2));
    song.notes.push(new r.Note(p2, startTime + interval*3, interval*2));
  }

  appendArp(60, 63, 67);
  appendArp(60, 63, 67);
  appendArp(60, 63, 68);
  appendArp(60, 63, 68);
  appendArp(60, 63, 67);
  appendArp(60, 63, 67);
  appendArp(59, 62, 67);
  appendArp(59, 62, 67);

  r.getNoteCount = function() {
    return song.notes.length;
  };

  r.getNote = function(index) {
    return song.notes[index];
  };

  r.insertNote = function(note) {
    // TODO: impl
  };

})(this.Rhombus);
