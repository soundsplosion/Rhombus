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

    r.Edit.insertNote = function(note) {
      r._song.notesMap[note.id] = note;
      r._song.notes.push(note);
    };


    r.Edit.changeNoteTime = function(noteid, start, length) {
      var note = r._song.notesMap[noteid];

      var shouldBePlaying = start <= curTicks && curTicks <= (start + length);

      if (!shouldBePlaying) {
        stopIfPlaying(note);
      }

      note._start = start;
      note._length = length;
    };

    r.Edit.changeNotePitch = function(noteid, pitch) {
      var note = r._song.notesMap[noteid];

      if (pitch === note.getPitch()) {
        return;
      }

      r.Instrument.noteOff(note.id, 0);
      note._pitch = pitch;
    };

    r.Edit.deleteNote = function(noteid) {
      var note = r._song.notesMap[noteid];

      delete r._song.notesMap[note.id];

      var notes = r._song.notes;
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
