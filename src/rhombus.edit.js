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
        for (var instId in r._song._instruments) {
          r._song._instruments[instId].triggerRelease(rtNoteId, 0);
        }
      }
    }

    r.Edit.insertNote = function(note, ptnId) {
      r._song._patterns[ptnId].addNote(note);
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      r._song._patterns[ptnId].deleteNote(noteId);

      // TODO: find another way to terminate deleted notes
      //       as things stand, deleted notes will stop playing
      //       naturally, but not when the pattern note is deleted
      /*
      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        if (noteId in playingNotes) {
          r.Instrument.triggerRelease(rtNoteId, 0);
          delete playingNotes[rtNoteId];
        }
      }
      */
    };

    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (notDefined(note)) {
        return;
      }

      var curTicks = r.seconds2Ticks(r.getPosition());

      // TODO: See note in deleteNote()
      /*
      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        if (rtNoteId in playingNotes) {
          r.Instrument.triggerRelease(rtNoteId, 0);
          delete playingNotes[rtNoteId];
        }
      }
      */

      note._start = start;
      note._length = length;
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (notDefined(note)) {
        return;
      }

      if (pitch === note.getPitch()) {
        return;
      }

      for (var instId in r._song._instruments) {
        r._song._instruments[instId].triggerRelease(rtNoteId, 0);
      }
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
  };
})(this.Rhombus);
