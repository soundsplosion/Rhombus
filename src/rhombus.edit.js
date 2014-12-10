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

    /*var interval = 240;
    var last = 960 - interval;

    function appendArp(p1, p2, p3) {
      var startTime = last + interval;
      last += interval*4;

      r.Edit.insertNote(new r.Note(p1, startTime, interval*2));
      r.Edit.insertNote(new r.Note(p2, startTime + interval, interval*2));
      r.Edit.insertNote(new r.Note(p3, startTime + interval*2, interval*2));
      r.Edit.insertNote(new r.Note(p2, startTime + interval*3, interval*2));
    }

    appendArp(60, 63, 67);
    appendArp(60, 63, 67);
    appendArp(60, 63, 68);
    appendArp(60, 63, 68);
    appendArp(60, 63, 67);
    appendArp(60, 63, 67);
    appendArp(59, 62, 67);
    appendArp(59, 62, 67);*/

    r.Edit.insertNote(new r.Note(60, 480, 4800));

  };
})(this.Rhombus);
