//! rhombus.pattern.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._patternSetup = function(r) {

    r.Pattern = function(id) {
      if (id) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // pattern metadata
      this._name = "Default Pattern Name";

      // pattern structure data
      this._noteMap = {};

      // TODO: determine if length should be defined here,
      // or in Track....
    };

    r.Pattern.prototype = {
      addNote: function(note) {
        this._noteMap[note._id] = note;
      }
    };

    // TODO: Note should probaly have its own source file
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
  };
})(this.Rhombus);
