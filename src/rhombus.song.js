//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._songSetup = function(r) {
    r.Song = {};

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

      getStart: function() {
        return this._start;
      },

      getLength: function() {
        return this._length;
      },

      getEnd: function() {
        return this._start + this._length;
      }

    };

    function newSong() {
      //r.Song.notes = new Array();
      //r.Song.notesMap = {};
      r.Song.pattern = new r.Pattern();
    }

    newSong();

    r.getNoteCount = function() {
      return r.Song.pattern.notes.length;
    };

    r.getNote = function(index) {
      return r.Song.pattern.notes[index];
    };

    r.getSongLengthSeconds = function() {
      var lastNote = r.Song.pattern.notes[r.getNoteCount() - 1];
      return r.ticks2Seconds(lastNote.getStart() + lastNote.getLength());
    };

    r.importSong = function(json) {
      newSong();
      var notes = JSON.parse(json).notes;
      for (var i = 0; i < notes.length; i++) {
        r.Edit.insertNote(new r.Note(notes[i]._pitch, 
                                     notes[i]._start, 
                                     notes[i]._length, 
                                     notes[i].id));
      }
    }

    r.exportSong = function() {
      return JSON.stringify(r.Song);
    };

  };
})(this.Rhombus);
