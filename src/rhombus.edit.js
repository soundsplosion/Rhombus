//! rhombus.edit.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._editSetup = function(r) {
    r.Edit = {};

    function stopIfPlaying(note) {
      var curTicks = r.seconds2Ticks(r.getPosition());
      var playing = note.getStart() <= curTicks && curTicks <= note.getEnd();
      if (playing) {
        r._song._instruments.objIds().forEach(function(instId) {
          r._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
        });
      }
    }

    r.Edit.insertNote = function(note, ptnId) {
      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].deleteNote(note._id);
      });

      return r._song._patterns[ptnId].addNote(note);
    };

    // Inserts an array of notes into an existing pattern, with the start
    // times offset by the given amount
    //
    // The anticipated use case is inserting recorded notes, in which case
    // the offset would typically be a negative value (since all patterns start
    // at tick 0 internally)
    r.Edit.insertNotes = function(notes, ptnId, offset) {
      offset = (isDefined(offset)) ? offset : 0;
      var ptn = r._song._patterns[ptnId];

      // Even though the notes are modified below,
      // the slice is a shallow copy so the notes
      // passed to deleteNotes in the undo action
      // are the proper, modified versions.
      var notesCopy = notes.slice(0);
      r.Undo._addUndoAction(function() {
        ptn.deleteNotes(notesCopy);
      });

      for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        if (isDefined(note)) {
          note._start = note._start + offset;
          ptn.addNote(note);
        }
      }
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      // TODO: put checks on the input arguments
      var note = r._song._patterns[ptnId].deleteNote(noteId);

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].addNote(note);
      });
    };

    r.Edit.deleteNotes = function(notes, ptnId) {
      r._song._patterns[ptnId].deleteNotes(notes);
      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].addNotes(notes);
      });
    };

    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {

      if (start < 0 || length < 1) {
        return undefined;
      }

      var note = r._song._patterns[ptnId]._noteMap.getNote(noteId);

      if (notDefined(note)) {
        return undefined;
      }

      var oldStart = note._start;
      var oldLength = note._length;

      r._song._patterns[ptnId].deleteNote(noteId, note);
      note._start = start;
      note._length = length;
      r._song._patterns[ptnId].addNote(note);

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].deleteNote(noteId, note);
        note._start = oldStart;
        note._length = oldLength;
        r._song._patterns[ptnId].addNote(note);
      });

      return noteId;
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      // TODO: put checks on the input arguments
      var note = r._song._patterns[ptnId].getNote(noteId);

      if (notDefined(note)) {
        return undefined;
      }

      var oldPitch = note._pitch;
      r.Undo._addUndoAction(function() {
        note._pitch = oldPitch;
      });

      if (pitch !== note.getPitch()) {
        r._song._instruments.objIds().forEach(function(instId) {
          r._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
        });

        note._pitch = pitch;
      }

      // Could return anything here...
      return noteId;
    };

    r.Edit.updateNote = function(noteId, pitch, start, length, velocity, ptnId) {

      if (start < 0 || length < 1 || velocity < 0 || velocity > 1) {
        return undefined;
      }

      var note = r._song._patterns[ptnId].getNote(noteId);

      if (notDefined(note)) {
        return undefined;
      }

      var oldPitch    = note._pitch;
      var oldStart    = note._start;
      var oldLength   = note._length;
      var oldVelocity = note._velocity;

      r._song._patterns[ptnId].deleteNote(noteId, note);
      note._pitch    = pitch;
      note._start    = start;
      note._length   = length;
      note._velocity = velocity;
      r._song._patterns[ptnId].addNote(note);

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].deleteNote(noteId, note);
        note._pitch    = oldPitch;
        note._start    = oldStart;
        note._length   = oldLength;
        note._velocity = oldVelocity;
        r._song._patterns[ptnId].addNote(note);
      });

      return noteId;
    };

    r.Edit.translateNotes = function(notes, pitchOffset, timeOffset) {
      var i;

      var newValues = new Array(notes.length);
      var oldValues = new Array(notes.length);

      // pre-compute and validate the translations before applying them
      for (i = 0; i < notes.length; i++) {
        var dstPitch = notes[i]._pitch + pitchOffset;
        var dstStart = notes[i]._start + timeOffset;

        // validate the translations
        if (dstPitch > 127 || dstPitch < 0 || dstStart < 0) {
          return false;
        }

        newValues[i] = [dstPitch, dstStart];
        oldValues[i] = [notes[i]._pitch, notes[i]._start];
      }

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          notes[i]._pitch = oldValues[i][0];
          notes[i]._start = oldValues[i][1];
        }
      });

      // apply the translations
      for (i = 0; i < notes.length; i++) {
        notes[i]._pitch = newValues[i][0];
        notes[i]._start = newValues[i][1];
      }

      return true;
    };

    // Makes a copy of the source pattern and adds it to the song's pattern set.
    r.Edit.copyPattern = function(ptnId) {
      var srcPtn = r._song._patterns[ptnId];

      if (notDefined(srcPtn)) {
        return undefined;
      }

      var dstPtn = new r.Pattern();

      srcPtn._noteMap._avl.executeOnEveryNode(function (node) {
        for (var i = 0; i < node.data.length; i++) {
          var srcNote = node.data[i];
          var dstNote = new r.Note(srcNote._pitch,
                                 srcNote._start,
                                 srcNote._length,
                                 srcNote._velocity);

          dstPtn.addNote(dstNote);
        }
      });

      dstPtn.setName(srcPtn.getName() + "-copy");

      r.Undo._addUndoAction(function() {
        delete r._song._patterns[dstPtn._id];
      });

      r._song._patterns[dstPtn._id] = dstPtn;
      return dstPtn._id;
    };

    // Splits a source pattern into two destination patterns
    // at the tick specified by the splitPoint argument.
    r.Edit.splitPattern = function(ptnId, splitPoint) {
      var srcPtn = r._song._patterns[ptnId];

      if (notDefined(srcPtn) || !isInteger(splitPoint)) {
        return undefined;
      }

      if (splitPoint < 0 || splitPoint > srcPtn._length) {
        return undefined;
      }

      var dstL = new r.Pattern();
      var dstR = new r.Pattern();

      srcPtn._noteMap._avl.executeOnEveryNode(function (node) {
        for (var i = 0; i < node.data.length; i++) {
          var srcNote = node.data[i];
          var dstLength = srcNote._length;

          var dstPtn;
          var dstStart;

          // Determine which destination pattern to copy into
          // and offset the note start accordingly
          if (srcNote._start < splitPoint) {
            dstPtn = dstL;
            dstStart = srcNote._start;

            // Truncate notes that straddle the split point
            if ((srcNote._start + srcNote._length) > splitPoint) {
              dstLength = splitPoint - srcNote._start;
            }
          }
          else {
            dstPtn = dstR;
            dstStart = srcNote._start - splitPoint;
          }

          // Create a new note and add it to the appropriate destination pattern
          var dstNote = new r.Note(srcNote._pitch, dstStart, dstLength, srcNote._velocity);
          dstPtn._noteMap[dstNote._id] = dstNote;
        }
      });

      // Uniquify the new pattern names (somewhat)
      dstL.setName(srcPtn.getName() + "-A");
      dstR.setName(srcPtn.getName() + "-B");

      var lId = dstL._id;
      var rId = dstR._id;
      r.Undo._addUndoAction(function() {
        delete r._song._patterns[lId];
        delete r._song._patterns[rId];
      });

      // Add the two new patterns to the song pattern set
      r._song._patterns[dstL._id] = dstL;
      r._song._patterns[dstR._id] = dstR;

      // return the pair of new IDs
      return [dstL._id, dstR._id];
    };

    // Returns an array containing all notes within a given horizontal (time) and
    // and vertical (pitch) range.
    //
    // The lowNote and highNote arguments are optional. If they are undefined, all
    // of the notes within the time range will be returned.
    r.Edit.getNotesInRange = function(ptnId, start, end, lowNote, highNote) {
      var srcPtn = r._song._patterns[ptnId];
      if (notDefined(srcPtn) || !isInteger(start) || !isInteger(end)) {
        return undefined;
      }

      // assign defaults to the optional arguments
      lowNote  = +lowNote  || 0;
      highNote = +highNote || 127;

      var notes = srcPtn.getNotesInRange(start, end);
      for (var i = notes.length - 1; i >= 0; i--) {
        var srcPitch = notes[i]._pitch;
        if (srcPitch > highNote || srcPitch < lowNote) {
          notes.splice(i, i);
        }
      }

      // TODO: decide if we should return undefined if there are no matching notes
      return notes;
    };

    r.Edit.quantizeNotes = function(notes, quantize, doEnds) {
      var notes = [];
      var oldStarts = [];
      var oldLengths = [];

      r.Undo.addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          var note = notes[i];
          note._start = oldStarts[i];
          note._length = oldLengths[i];
        }
      });

      for (var i = 0; i < notes.length; i++) {
        var srcNote = notes[i];

        notes.push(srcNote);
        oldStarts.push(srcNote._start);
        oldLengths.push(srcNote._length);

        var srcStart = srcNote.getStart();
        srcNote._start = quantizeTick(srcStart, quantize);

        // optionally quantize the ends of notes
        if (doEnds === true) {
          var srcLength = srcNote.getLength();
          var srcEnd = srcNote.getEnd();

          if (srcLength < quantize) {
            srcNote._length = quantize;
          }
          else {
            srcNote._length = quantizeTick(srcEnd, quantize) - srcNote.getStart();
          }
        }
      }
    };
  };
})(this.Rhombus);
