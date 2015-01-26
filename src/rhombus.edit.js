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
      r._song._patterns[ptnId]._noteMap[note._id] = note;
    };

    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (note === undefined)
        return;

      var curTicks = r.seconds2Ticks(r.getPosition());

      //var shouldBePlaying =
      //  (start <= curTicks) && (curTicks <= (start + length));

      if (noteId in r._song._patterns[ptnId]._playingNotes) {
        r.Instrument.noteOff(noteId, 0);
        delete r._song._patterns[ptnId]._playingNotes[noteId];
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

    r.Edit.deleteNote = function(noteId, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (note === undefined)
        return;

      delete r._song._patterns[ptnId]._noteMap[note._id];

      if (noteId in r._song._patterns[ptnId]._playingNotes) {
        r.Instrument.noteOff(noteId, 0);
        delete r._song._patterns[ptnId]._playingNotes[noteId];
      }
    };

  };
})(this.Rhombus);
