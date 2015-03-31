//! rhombus.pattern.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._patternSetup = function(r) {

    r.Pattern = function(id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // pattern metadata
      this._name = "Default Pattern Name";
      this._color = getRandomColor();
      this._selected = false;

      // pattern structure data
      this._length = 1920;
      this._noteMap = {};
    };

    // TODO: make this interface a little more sanitary...
    //       It's a rather direct as-is
    r.Pattern.prototype = {

      getLength: function() {
        return this._length;
      },

      setLength: function(length) {
        if (isDefined(length) && length >= 0) {
          var oldLength = this._length;
          var that = this;
          r.Undo._addUndoAction(function() {
            that._length = oldLength;
          });
          this._length = length;
        }
      },

      getName: function() {
        return this._name;
      },

      setName: function(name) {
        if (notDefined(name)) {
          return undefined;
        } else {
          var oldName = this._name;
          this._name = name.toString();

          var that = this;
          r.Undo._addUndoAction(function() {
            that._name = oldName;
          });

          return this._name;
        }
      },

      // TODO: validate this color stuff
      getColor: function() {
        return this._color;
      },

      setColor: function(color) {
        var oldColor = this._color;
        var that = this;
        r.Undo._addUndoAction(function() {
          that._color = oldColor;
        });
        this._color = color;
      },

      addNote: function(note) {
        this._noteMap[note._id] = note;
      },

      getNoteMap: function() {
        return this._noteMap;
      },

      deleteNote: function(noteId) {
        var note = this._noteMap[noteId];

        if (notDefined(note)) {
          return undefined;
        }

        delete this._noteMap[note._id];

        return note;
      },

      getSelectedNotes: function() {
        var selected = new Array();
        for (var noteId in this._noteMap) {
          var note = this._noteMap[noteId];
          if (note.getSelected()) {
            selected.push(note);
          }
        }

        return selected;
      },

      deleteNotes: function(notes) {
        for (var i = 0; i < notes.length; i++) {
          var note = notes[i];
          delete this._noteMap[note._id];
        }
      },

      toJSON: function() {
        var jsonObj = {
          _name    : this._name,
          _color   : this._color,
          _length  : this._length,
          _noteMap : this._noteMap
        };
        return jsonObj;
      }
    };

    // TODO: Note should probably have its own source file
    r.Note = function(pitch, start, length, velocity, id) {
       // validate the pitch
      if (!isInteger(pitch) || pitch < 0 || pitch > 127) {
        console.log("pitch invalid:" + pitch);
        return undefined;
      }

      // validate the start
      if (!isNumber(start) || start < 0) {
        console.log("start invalid");
        return undefined;
      }

      // validate the length
      if (!isNumber(length) || length < 0) {
        console.log("length invalid");
        return undefined;
      }

      // validate the velocity
      if (!isNumber(velocity) || velocity < 0) {
        console.log("velocity invalid");
        return undefined;
      }

      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      this._pitch    = +pitch;
      this._start    = +start    || 0;
      this._length   = +length   || 0;
      this._velocity = +velocity || 0.5;
      this._selected = false;

      return this;
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

      getVelocity: function() {
        return this._velocity;
      },

      setVelocity: function(velocity) {
        var floatVal = parseFloat(velocity);
        if (isDefined(floatVal) && floatVal > 0 && floatVal <= 1.0) {
          this._velocity = floatVal;
        }
      },

      // TODO: check for off-by-one issues
      getEnd: function() {
        return this._start + this._length;
      },

      select: function() {
        return (this._selected = true);
      },

      deselect: function() {
        return (this._selected = false);
      },

      getSelected: function() {
        return this._selected;
      },

      setSelected: function(select) {
        return (this._selected = select);
      },

      toJSON: function() {
        var jsonObj = {
          _pitch    : this._pitch,
          _start    : this._start,
          _length   : this._length,
          _velocity : this._velocity
        };
        return jsonObj;
      }
    };
  };
})(this.Rhombus);
