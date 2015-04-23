//! rhombus.pattern.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._patternSetup = function(r) {

    r.NoteMap = function(id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      this._avl = new AVL();
    };

    r.NoteMap.prototype = {
      addNote: function(note) {
        if (!(note instanceof r.Note)) {
          console.log("[Rhombus] - trying to add non-Note object to NoteMap");
          return false;
        }

        var key = Math.round(note.getStart());

        // don't allow multiple copies of the same note
        var elements = this._avl.search(key);
        for (var i = 0; i < elements.length; i++) {
          if (note === elements[i]) {
            console.log("[Rhombus] - trying to add duplicate Note to NoteMap");
            return false;
          }
        }

        if (isDefined(r._constraints.max_notes)) {
          if (r._song._noteCount >= r._constraints.max_notes) {
            return false;
          }
        }

        r._song._noteCount++;
        this._avl.insert(key, note);
        return true;
      },

      getNote: function(noteId) {
        var retNote = undefined;
        this._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            var note = node.data[i];
            if (note._id === noteId) {
              retNote = note;
              return;
            }
          }
        });

        return retNote;
      },

      getNotesAtTick: function(tick, lowPitch, highPitch) {
        if (notDefined(lowPitch) && notDefined(highPitch)) {
          var lowPitch  = 0;
          var highPitch = 127;
        }
        if (!isInteger(tick) || tick < 0) {
          return undefined;
        }

        if (!isInteger(lowPitch) || lowPitch < 0 || lowPitch > 127) {
          return undefined;
        }

        if (!isInteger(highPitch) || highPitch < 0 || highPitch > 127) {
          return undefined;
        }

        var retNotes = new Array();
        this._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            var note = node.data[i];
            var noteStart = note._start;
            var noteEnd   = noteStart + note._length;
            var notePitch = note._pitch;

            if ((noteStart <= tick) && (noteEnd >= tick) &&
                (notePitch >= lowPitch && notePitch <= highPitch)) {
              retNotes.push(note);
            }
          }
        });

        return retNotes;
      },

      removeNote: function(noteId, note) {
        if (notDefined(note) || !(note instanceof r.Note)) {
          note = this.getNote(noteId);
        }

        if (notDefined(note)) {
          console.log("[Rhombus] - note not found in NoteMap");
          return false;
        }

        var atStart = this._avl.search(note.getStart()).length;
        if (atStart > 0) {
          r._song._noteCount--;
          this._avl.delete(note.getStart(), note);
        }

        return true;
      },

      toJSON: function() {
        var jsonObj = {};
        this._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            var note = node.data[i];
            jsonObj[note._id] = note;
          }
        });
        return jsonObj;
      }
    };

    r.AutomationEvent = function(time, value, id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      this._time = time;
      this._value = value;
    };

    r.AutomationEvent.prototype.getTime = function() {
      if (notInteger(this._time)) {
        this._time = 0;
      }
      return this._time;
    }

    r.AutomationEvent.prototype.getValue = function() {
      if (notNumber(this._value)) {
        this._value = 0.5;
      }
      return this._value;
    }

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
      this._noteMap = new r.NoteMap();

      this._automation = new AVL({ unique: true });
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
        this._noteMap.addNote(note);
        this.clearSelectedNotes();
      },

      addNotes: function(notes) {
        if (isDefined(notes)) {
          for (var i = 0; i < notes.length; i++) {
            this.addNote(notes[i]);
          }
        }
        this.clearSelectedNotes();
      },

      getNote: function(noteId) {
        return this._noteMap.getNote(noteId);
      },

      deleteNote: function(noteId, note) {
        if (notDefined(note)) {
          note = this._noteMap.getNote(noteId);
        }

        if (notDefined(note)) {
          console.log("[Rhombus] - note not found in pattern");
          return undefined;
        }

        this._noteMap.removeNote(noteId, note);
        return note;
      },

      deleteNotes: function(notes) {
        if (notDefined(notes)) {
          return;
        }
        for (var i = 0; i < notes.length; i++) {
          var note = notes[i];
          this.deleteNote(note._id, note);
        }
      },

      getAllNotes: function() {
        var notes = new Array();
        this._noteMap._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            notes.push(node.data[i]);
          }
        });
        return notes;
      },

      getNotesInRange: function(start, end, ignoreEnds) {
        // only consider the start tick
        if (isDefined(ignoreEnds) && ignoreEnds === true) {
          return this._noteMap._avl.betweenBounds({ $lt: end, $gte: start });
        }

        // consider both start and end ticks
        var notes = new Array();
        this._noteMap._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            var srcStart = node.data[i]._start;
            var srcEnd   = srcStart + node.data[i]._length;

            if ((start < srcStart && end < srcStart) || (start > srcEnd)) {
              continue;
            }

            notes.push(node.data[i]);
          }
        });
        return notes;
      },

      getNotesAtTick: function(tick, lowPitch, highPitch, single) {
        var selection = this._noteMap.getNotesAtTick(tick, lowPitch, highPitch);

        if (notDefined(selection) || selection.length < 2 || notDefined(single) || !single) {
          return selection;
        }

        var shortest = selection[0];

        for (var i = 0; i < selection.length; i++) {
          var note = selection[i];
          shortest = (note._length < shortest._length) ? note : shortest;
        }

        return [shortest];
      },

      getSelectedNotes: function() {
        var selected = new Array();
        this._noteMap._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            var note = node.data[i];
            if (note.getSelected()) {
              selected.push(note);
            }
          }
        });
        return selected;
      },

      clearSelectedNotes: function() {
        var selected = this.getSelectedNotes();
        for (var i = 0; i < selected.length; i++) {
          selected[i].deselect();
        }
      },

      getAutomationEventsInRange: function(start, end) {
        return this._automation.betweenBounds({ $lt: end, $gte: start });
      },

      toJSON: function() {
        var jsonObj = {
          "_id"      : this._id,
          "_name"    : this._name,
          "_color"   : this._color,
          "_length"  : this._length,
          "_noteMap" : this._noteMap.toJSON()
        };
        return jsonObj;
      }
    };

    // TODO: Note should probably have its own source file
    r.Note = function(pitch, start, length, velocity, id) {
      if (!isInteger(pitch) || pitch < 0 || pitch > 127) {
        console.log("[Rhombus] - Note pitch invalid: " + pitch);
        return undefined;
      }

      if (!isInteger(start) || start < 0) {
        console.log("[Rhombus] - Note start invalid: " + start);
        return undefined;
      }

      if (!isInteger(length) || length < 1) {
        console.log("[Rhombus] - Note length invalid: " + length);
        return undefined;
      }

      if (!isNumber(velocity) || velocity < 0 || velocity > 1) {
         console.log("[Rhombus] - Note velocity invalid: " + velocity);
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

      toggleSelect: function() {
        return (this._selected = !this._selected);
      },

      getSelected: function() {
        return this._selected;
      },

      setSelected: function(select) {
        return (this._selected = select);
      },

      toJSON: function() {
        var jsonObj = {
          "_id"       : this._id,
          "_pitch"    : this._pitch,
          "_start"    : this._start,
          "_length"   : this._length,
          "_velocity" : this._velocity
        };
        return jsonObj;
      }
    };
  };
})(this.Rhombus);
