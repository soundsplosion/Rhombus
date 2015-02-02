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
        r.Instrument.triggerRelease(note._id, 0);
      }
    }

    r.Edit.insertNote = function(note, ptnId) {
      r._song._patterns[ptnId].addNote(note);
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      r._song._patterns[ptnId].deleteNote(noteId);

      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        if (noteId in playingNotes) {
          r.Instrument.triggerRelease(noteId, 0);
          delete playingNotes[noteId];
        }
      }
    };

    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (note === undefined)
        return;

      var curTicks = r.seconds2Ticks(r.getPosition());

      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        if (noteId in playingNotes) {
          r.Instrument.triggerRelease(noteId, 0);
          delete playingNotes[noteId];
        }
      }

      note._start = start;
      note._length = length;
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (note === undefined)
        return;

      if (pitch === note.getPitch()) {
        return;
      }

      r.Instrument.triggerRelease(note._id, 0);
      note._pitch = pitch;
    };
  };
})(this.Rhombus);
