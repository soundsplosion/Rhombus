//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._songSetup = function(r) {
    r.Song = {};
    r.Song.patterns = {};

    r.Song.addPattern = function() {
      r.Song.patterns[r.Song.patterns.length] = new r.Pattern();
    };

    // TODO: this still reflects the single, hard-coded pattern paradigm
    //       of yesteryear.
    function newSong() {
      r.Song.patterns = new Array();
      r.Song.addPattern();
    }

    newSong();

    r.getSongLengthSeconds = function() {
      // var lastNote = r.Song.patterns[0].notes[r.getNoteCount() - 1];
      //return r.ticks2Seconds(lastNote.getStart() + lastNote.getLength());
      return 4.0;
    };

    // TODO: refactor to handle multiple tracks, patterns, etc.
    //       patterns, etc., need to be defined first, of course...
    r.importSong = function(json) {
      newSong();
      var notes = JSON.parse(json).notes;
      for (var i = 0; i < notes.length; i++) {
        r.Edit.insertNote(new r.Note(notes[i]._pitch,
                                     notes[i]._start,
                                     notes[i]._length,
                                     notes[i].id),
                          0); // this is the pattern ID, oughtn't be hard-coded
      }
    }

    r.exportSong = function() {
      return JSON.stringify(r.Song);
    };

  };
})(this.Rhombus);
