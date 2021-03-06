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
      if (notDefined(note)) {
        return;
      }

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
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

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
          if (note._start < 0) {
            note._start = 0;
          }
          ptn.addNote(note);
        }
      }
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      var note = r._song._patterns[ptnId].deleteNote(noteId);

      if (notDefined(note)) {
        return;
      }

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].addNote(note);
      });
    };

    r.Edit.deleteNotes = function(notes, ptnId) {
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

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

    r.Edit.updateVelocities = function(notes, velocity, onlySelected) {
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

      if (notDefined(velocity) || !isNumber(velocity) || velocity < 0 || velocity > 1) {
        console.log("[Rhombus.Edit] - invalid velocity");
        return false;
      }

      if (notDefined(onlySelected) || typeof onlySelected !== "boolean") {
        console.log("[Rhombus.Edit] - onlySelected must be of type Boolean");
        return false;
      }

      for (var i = 0; i < notes.length; i++) {
        if (onlySelected && !notes[i]._selected) {
          continue;
        }
        notes[i]._velocity = velocity;
      }

      return true;
    };

    r.Edit.isValidTranslation = function(notes, pitchOffset, timeOffset) {
      for (i = 0; i < notes.length; i++) {
        var dstPitch = notes[i]._pitch + pitchOffset;
        var dstStart = notes[i]._start + timeOffset;

        // validate the translations
        if (dstPitch > 127 || dstPitch < 0 || dstStart < 0) {
          return false;
        }
      }

      return true;
    };

    r.Edit.translateNotes = function(ptnId, notes, pitchOffset, timeOffset) {
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

      var ptn = r._song._patterns[ptnId];
      if (notDefined(ptn)) {
        console.log("[Rhombus.Edit] - pattern is not defined");
        return false;
      }

      var newValues = new Array(notes.length);
      var oldValues = new Array(notes.length);

      var maxPitch = 0;
      var minPitch = 127;
      var minStart = 1e6;

      // pre-compute and validate the translations before applying them
      for (var i = 0; i < notes.length; i++) {
        var dstPitch = notes[i]._pitch + pitchOffset;
        var dstStart = notes[i]._start + timeOffset;

        maxPitch = (dstPitch > maxPitch) ? dstPitch : maxPitch;
        minPitch = (dstPitch < minPitch) ? dstPitch : minPitch;
        minStart = (dstStart < minStart) ? dstStart : minStart;

        newValues[i] = [dstPitch, dstStart];
        oldValues[i] = [notes[i]._pitch, notes[i]._start];
      }

      var pitchDiff = 0;
      if (maxPitch > 127) {
        pitchDiff = 127 - maxPitch;
      }
      else if (minPitch < 0) {
        pitchDiff = -minPitch;
      }

      var startDiff = 0;
      if (minStart < 0) {
        startDiff = -minStart;
      }

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          ptn._noteMap._avl.delete(notes[i]._start, notes[i]);
          notes[i]._pitch = oldValues[i][0];
          notes[i]._start = oldValues[i][1];
          ptn._noteMap._avl.insert(notes[i]._start, notes[i]);
        }
      });

      // apply the translations
      for (var i = 0; i < notes.length; i++) {
        ptn._noteMap._avl.delete(notes[i]._start, notes[i]);
        notes[i]._pitch = newValues[i][0] + pitchDiff;
        notes[i]._start = newValues[i][1] + startDiff;
        ptn._noteMap._avl.insert(notes[i]._start, notes[i]);
      }

      return true;
    };

    r.Edit.offsetNoteLengths = function(ptnId, notes, lengthOffset, minLength) {
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

      var ptn = r._song._patterns[ptnId];
      if (notDefined(ptn)) {
        console.log("[Rhombus.Edit.offsetNoteLengths] - pattern is not defined");
        return false;
      }

      // if no minimum is specified, use 30 ticks (64th note)
      if (notDefined(minLength)) {
        minLength = 30;
      }

      var newValues = new Array(notes.length);
      var oldValues = new Array(notes.length);

      // pre-compute the changes before applying them (maybe validate eventually)
      for (var i = 0; i < notes.length; i++) {
        var dstLength = notes[i]._length + lengthOffset;

        // don't resize notes to smaller than the minimum
        dstLength = (dstLength < minLength) ? minLength : dstLength;

        newValues[i] = dstLength;
        oldValues[i] = notes[i]._length;
      }

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          notes[i]._length = oldValues[i];
        }
      });

      // apply the changes
      for (var i = 0; i < notes.length; i++) {
        notes[i]._length = newValues[i];
      }

      return true;
    };

    r.Edit.applyNoteLengths = function(notes, lengths) {
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

      var oldValues = new Array(notes.length);
      for (var i = 0; i < notes.length; i++) {
        oldValues[i] = notes[i]._length;
      }

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          notes[i]._length = oldValues[i];
        }
      });

      // apply the changes
      for (var i = 0; i < notes.length; i++) {
        var length = lengths[i];
        if (length < 1) {
          r.Undo.doUndo();
          return false;
        }
        notes[i]._length = lengths[i];
      }

      return true;
    };

    r.Edit.setNoteLengths = function(ptnId, notes, length) {
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

      // make sure the new length is valid
      if (notDefined(length) || !isInteger(length) || length < 0) {
        console.log("[Rhombus.Edit.setNoteLengths] - length is not valid");
      }

      var ptn = r._song._patterns[ptnId];
      if (notDefined(ptn)) {
        console.log("[Rhombus.Edit.setNoteLengths] - pattern is not defined");
        return false;
      }

      var oldValues = new Array(notes.length);

      // cache the old lengths and apply the changes
      for (var i = 0; i < notes.length; i++) {
        oldValues[i] = notes[i]._length;
        notes[i]._length = length;
      }

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          notes[i]._length = oldValues[i];
        }
      });

      return true;
    };

    var noteChangesStarted = false;
    var oldNotes;
    var noteChangesPtnId;
    function undoAddedCallback() {
      if (noteChangesStarted) {
        noteChangesStarted = false;
        oldNotes = undefined;
        noteChangesPtnId = undefined;

        console.log("[Rhomb.Edit] - note changes interrupted by another undo action");
      }
    }
    r.Undo._registerUndoAddedCallback(undoAddedCallback);
    r.Edit.startNoteChanges = function(ptnId) {
      var pattern = r._song._patterns[ptnId];
      if (notDefined(pattern)) {
        return;
      }

      noteChangesStarted = true;
      noteChangesPtnId = ptnId;
      var oldNoteMap = JSON.parse(JSON.stringify(pattern))._noteMap;
      oldNotes = r._noteArrayFromJSONNoteMap(oldNoteMap);
    };

    r.Edit.endNoteChanges = function() {
      if (!noteChangesStarted) {
        return;
      }

      var changedPtnId = noteChangesPtnId;
      var changedNotes = oldNotes;

      noteChangesStarted = false;
      oldNotes = undefined;
      noteChangesPtnId = undefined;
      r.Undo._addUndoAction(function() {
        var pattern = r._song._patterns[changedPtnId];
        pattern.deleteNotes(pattern.getAllNotes());
        for (var noteIdx = 0; noteIdx < changedNotes.length; noteIdx++) {
          var note = changedNotes[noteIdx];
          pattern.addNote(note);
        }
      });
    };

    function findEventInArray(id, eventArray) {
      for (var i = 0; i < eventArray.length; i++) {
        if (eventArray[i]._id === id) {
          return eventArray[i];
        }
      }
      return undefined;
    }

    function findEventInAVL(id, avl) {
      var theEvent;
      avl.executeOnEveryNode(function(node) {
        for (var i = 0; i < node.data.length; i++) {
          var ev = node.data[i];
          if (ev._id === id) {
            theEvent = ev;
            return;
          }
        }
      });
      return theEvent;
    }

    r.Edit.insertAutomationEvent = function(time, value, ptnId) {
      var pattern = r._song._patterns[ptnId];
      var atThatTime = pattern._automation.search(time);
      if (atThatTime.length > 0) {
        return false;
      }

      pattern._automation.insert(time, new Rhombus.AutomationEvent(time, value, r));

      /*
        r.Undo._addUndoAction(function() {
        pattern._automation.delete(time);
        });
      */

      return true;
    };

    r.Edit.deleteAutomationEvent = function(time, ptnId) {
      var pattern = r._song._patterns[ptnId];
      var atTime = pattern._automation.search(time);
      if (atTime.length === 0) {
        return false;
      }

      pattern._automation.delete(time);
      return true;
    };

    r.Edit.deleteAutomationEventById = function(eventId, ptnId, internal) {
      var pattern = r._song._patterns[ptnId];

      var theEvent = findEventInAVL(eventId, pattern._automation);
      if (notDefined(theEvent)) {
        return false;
      }

      /*
        if (!internal) {
        r.Undo._addUndoAction(function() {
        pattern._automation.insert(time, theEvent);
        });
        }
      */

      pattern._automation.delete(theEvent.getTime());
      return true;
    };

    r.Edit.deleteAutomationEventsInRange = function(start, end, ptnId) {
      var pattern = r._song._patterns[ptnId];
      var events = pattern.getAutomationEventsInRange(start, end);
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        r.Edit.deleteAutomationEventById(ev._id, ptnId, true);
      }

      /*
        r.Undo._addUndoAction(function() {
        for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        pattern._automation.insert(ev.getTime(), ev);
        }
        });
      */
    }

    r.Edit.insertOrEditAutomationEvent = function(time, value, ptnId) {
      var pattern = r._song._patterns[ptnId];
      var atThatTime = pattern._automation.search(time);
      if (atThatTime.length == 0) {
        return r.Edit.insertAutomationEvent(time, value, ptnId);
      }

      var theEvent = atThatTime[0];
      var oldValue = theEvent._value;

      /*
        r.Undo._addUndoAction(function() {
        theEvent._value = oldValue;
        });
      */

      theEvent._value = value;
      return true;
    };

    r.Edit.changeAutomationEventValue = function(eventId, newValue, ptnId) {
      var pattern = r._song._patterns[ptnId];
      var theEvent = findEventInAVL(eventId, pattern._automation);
      if (notDefined(theEvent)) {
        return false;
      }

      /*
        var oldValue = theEvent._value;
        r.Undo._addUndoAction(function() {
        theEvent._value = oldValue;
        });
      */

      theEvent._value = newValue;
      return true;
    };

    // Makes a copy of the source pattern and adds it to the song's pattern set.
    r.Edit.copyPattern = function(ptnId) {
      var srcPtn = r._song._patterns[ptnId];

      if (notDefined(srcPtn)) {
        return undefined;
      }

      var dstPtn = new Rhombus.Pattern(r);

      srcPtn._noteMap._avl.executeOnEveryNode(function (node) {
        for (var i = 0; i < node.data.length; i++) {
          var srcNote = node.data[i];
          var dstNote = new Rhombus.Note(srcNote._pitch,
                                         srcNote._start,
                                         srcNote._length,
                                         srcNote._velocity,
                                         r);

          dstPtn.addNote(dstNote);
        }
      });

      if (srcPtn.getName().lastIndexOf("-copy") < 0) {
        dstPtn.setName(srcPtn.getName() + "-copy");
      }
      else {
        dstPtn.setName(srcPtn.getName());
      }

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

      var dstL = new Rhombus.Pattern(r);
      var dstR = new Rhombus.Pattern(r);

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
          var dstNote = new Rhombus.Note(srcNote._pitch, dstStart, dstLength, srcNote._velocity, r);
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

      var notes = srcPtn.getNotesInRange(start, end, false);
      for (var i = notes.length - 1; i >= 0; i--) {
        var srcPitch = notes[i]._pitch;
        if (srcPitch > highNote || srcPitch < lowNote) {
          notes.splice(i, 1);
        }
      }

      // TODO: decide if we should return undefined if there are no matching notes
      return notes;
    };

    r.Edit.quantizeNotes = function(ptnId, notes, quantize, doEnds) {
      var srcPtn = r._song._patterns[ptnId];
      if (notDefined(srcPtn) || !isInteger(quantize)) {
        console.log("[Rhomb.Edit] - srcPtn is not defined");
        return undefined;
      }

      var oldNotes = notes.slice();

      var oldStarts  = new Array(notes.length);
      var oldLengths = new Array(notes.length);

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < oldNotes.length; i++) {
          var note = oldNotes[i];
          srcPtn.deleteNote(note._id, note);
          note._start = oldStarts[i];
          note._length = oldLengths[i];
          srcPtn.addNote(note);
        }
      });

      for (var i = 0; i < notes.length; i++) {
        var srcNote = notes[i];

        srcPtn.deleteNote(srcNote._id, srcNote);

        oldStarts[i]  = srcNote._start;
        oldLengths[i] = srcNote._length;

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

        srcPtn.addNote(srcNote);
      }
    };
  };
})(this.Rhombus);
