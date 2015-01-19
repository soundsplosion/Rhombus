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
        r.Instrument.noteOff(note.id, 0);
      }
    }

    r.Edit.insertNote = function(note, ptnId) {
      r.Song.patterns[ptnId].noteMap[note.id] = note;
      //r.Song.patterns[ptnId].notes.push(note);
    };

    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {
      var note = r.Song.patterns[ptnId].noteMap[noteId];

      var shouldBePlaying = start <= curTicks && curTicks <= (start + length);

      if (!shouldBePlaying) {
        stopIfPlaying(note);
      }

      note._start = start;
      note._length = length;
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      var note = r.Song.patterns[ptnId].noteMap[noteId];

      if (pitch === note.getPitch()) {
        return;
      }

      r.Instrument.noteOff(note.id, 0);
      note._pitch = pitch;
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      var note = r.Song.patterns[ptnId].noteMap[noteId];

      if (note === undefined)
        return;

      delete r.Song.patterns[ptnId].noteMap[note.id];
      stopIfPlaying(note);
    };

  };
})(this.Rhombus);
