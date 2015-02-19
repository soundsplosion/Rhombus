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
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      // TODO: put checks on the input arguments
      r._song._patterns[ptnId].deleteNote(noteId);
    };

    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {
      // TODO: put checks on the input arguments
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (notDefined(note)) {
        return;
      }

      note._start = start;
      note._length = length;

      // TODO: investigate ways to rescale RtNotes that are currently playing
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      // TODO: put checks on the input arguments
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (notDefined(note)) {
        return;
      }

      if (pitch === note.getPitch()) {
        return;
      }

      r._song._instruments.objIds().forEach(function(instId) {
        r._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
      });
      note._pitch = pitch;
    };

    // Makes a copy of the source pattern and adds it to the song's
    // pattern set. It might be preferable to just return the copy
    // without adding it to the song -- I dunno.
    r.Edit.copyPattern = function(ptnId) {
      var src = r._song._patterns[ptnId];

      if (notDefined(src)) {
        return undefined;
      }

      var dst = new r.Pattern();

      for (var noteId in src._noteMap) {
        var srcNote = src._noteMap[noteId];
        var dstNote = new r.Note(srcNote._pitch,
                                 srcNote._start,
                                 srcNote._length);

        dst._noteMap[dstNote._id] = dstNote;
      }

      r._song._patterns[dst._id] = dst;
      return dst._id;
    };

    r.Edit.splitPattern = function(ptnId, splitPoint) {
      var src = r._song._patterns[ptnId];

      if (notDefined(src) || notDefined(splitPoint)) {
        return undefined;
      }

      if (!isInteger(splitPoint) || splitPoint < 0 || splitPoint > src._length) {
        return undefined;
      }
      
      var dstL = new r.Pattern();
      var dstR = new r.Pattern();

      for (var noteId in src._noteMap) {
        var srcNote = src._noteMap[noteId];

        // Depending on which side of the split point each note in
        // the source pattern is on, copy the note into the left or right
        // destination pattern
        if (srcNote._start < splitPoint) {
          var dstNote = new r.Note(srcNote._pitch,
                                   srcNote._start,
                                   srcNote._length);
          
          dstL._noteMap[dstNote._id] = dstNote;
        }
        else {
          var dstNote = new r.Note(srcNote._pitch,
                                   srcNote._start - splitPoint,
                                   srcNote._length);
          
          dstR._noteMap[dstNote._id] = dstNote;
        }
      }
      
      // Add the two new patterns to the song pattern set
      r._song._patterns[dstL._id] = dstL;
      r._song._patterns[dstR._id] = dstR;
      
      // return the pair of new IDs
      return [dstL._id, dstR._id];
    };
  };
})(this.Rhombus);
