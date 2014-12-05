//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(r) {

  r.Note = function(pitch, start, length, id) {
    if (id) {
      r._setId(this, id);
    } else {
      r._newId(this);
    }
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

  var song;
  function newSong() {
    r._song = {};
    song = r._song;
    song.notes = new Array();
    song.notesMap = {};
  }

  newSong();

  r.getNoteCount = function() {
    return song.notes.length;
  };

  r.getNote = function(index) {
    return song.notes[index];
  };

  r.insertNote = function(note) {
    song.notesMap[note.id] = note;
    song.notes.push(note);
  };

  r.importSong = function(json) {
    newSong();
    var notes = JSON.parse(json).notes;
    for (var i = 0; i < notes.length; i++) {
      r.insertNote(new r.Note(notes[i]._pitch, notes[i]._start, notes[i]._length, notes[i].id));
    }
  }

  r.exportSong = function() {
    return JSON.stringify(song);
  };

  var interval = 240;
  var last = 960 - interval;

  function appendArp(p1, p2, p3) {
    var startTime = last + interval;
    last += interval*4;

    r.insertNote(new r.Note(p1, startTime, interval*2));
    r.insertNote(new r.Note(p2, startTime + interval, interval*2));
    r.insertNote(new r.Note(p3, startTime + interval*2, interval*2));
    r.insertNote(new r.Note(p2, startTime + interval*3, interval*2));
  }

  appendArp(60, 63, 67);
  appendArp(60, 63, 67);
  appendArp(60, 63, 68);
  appendArp(60, 63, 68);
  appendArp(60, 63, 67);
  appendArp(60, 63, 67);
  appendArp(59, 62, 67);
  appendArp(59, 62, 67);

})(this.Rhombus);
