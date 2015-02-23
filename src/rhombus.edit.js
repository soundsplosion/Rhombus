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
      // TODO: put checks on the input arguments
      r._song._patterns[ptnId].addNote(note);

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].deleteNote(note._id);
      });
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      // TODO: put checks on the input arguments
      var note = r._song._patterns[ptnId].deleteNote(noteId);

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].addNote(note);
      });
    };

    // TODO: investigate ways to rescale RtNotes that are currently playing
    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {

      if (start < 0 || length < 1) {
        return undefined;
      }

      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (notDefined(note)) {
        return undefined;
      }

      note._start = start;
      note._length = length;

      return noteId;
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      // TODO: put checks on the input arguments
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (notDefined(note) || (pitch === note.getPitch())) {
        return undefined;
      }

      r._song._instruments.objIds().forEach(function(instId) {
        r._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
      });

      note._pitch = pitch;

      // Could return anything here...
      return noteId;
    };

    // Makes a copy of the source pattern and adds it to the song's pattern set.
    r.Edit.copyPattern = function(ptnId) {
      var srcPtn = r._song._patterns[ptnId];

      if (notDefined(srcPtn)) {
        return undefined;
      }

      var dstPtn = new r.Pattern();

      for (var noteId in srcPtn._noteMap) {
        var srcPtnNote = srcPtn._noteMap[noteId];
        var dstNote = new r.Note(srcNote._pitch,
                                 srcNote._start,
                                 srcNote._length);

        dstPtn._noteMap[dstNote._id] = dstNote;
      }

      dstPtn.setName(srcPtn.getName() + "-copy");
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

      for (var noteId in srcPtn._noteMap) {
        var srcNote = srcPtn._noteMap[noteId];
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
        var dstNote = new r.Note(srcNote._pitch, dstStart, dstLength);
        dstPtn._noteMap[dstNote._id] = dstNote;
      }

      // Uniquify the new pattern names (somewhat)
      dstL.setName(srcPtn.getName() + "-A");
      dstR.setName(srcPtn.getName() + "-B");

      // Add the two new patterns to the song pattern set
      r._song._patterns[dstL._id] = dstL;
      r._song._patterns[dstR._id] = dstR;

      // return the pair of new IDs
      return [dstL._id, dstR._id];
    };
  };
})(this.Rhombus);
