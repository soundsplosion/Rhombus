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
      r.Song.patterns[ptnId].notesMap[note.id] = note;
      r.Song.patterns[ptnId].notes.push(note);
    };

    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {
      var note = r.Song.patterns[ptnId].notesMap[noteId];

      var shouldBePlaying = start <= curTicks && curTicks <= (start + length);

      if (!shouldBePlaying) {
        stopIfPlaying(note);
      }

      note._start = start;
      note._length = length;
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      var note = r.Song.patterns[ptnId].notesMap[noteId];

      if (pitch === note.getPitch()) {
        return;
      }

      r.Instrument.noteOff(note.id, 0);
      note._pitch = pitch;
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      var note = r.Song.patterns[ptnId].notesMap[noteId];

      delete r.Song.patterns[ptnId].notesMap[note.id];

      var notes = r.Song.patterns[ptnId].notes;
      for (var i = 0; i < notes.length; i++) {
        if (notes[i].id === note.id) {
          notes.splice(i, 1);
          stopIfPlaying(note);
          return;
        }
      }
    };

  };
})(this.Rhombus);
