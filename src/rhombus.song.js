//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._songSetup = function(r) {

    function Song() {
      this._length = 3840;
      this._patterns = {};
    };

    Song.prototype = {
      addPattern: function() {
        var pattern = new r.Pattern();
        this._patterns[pattern._id] = pattern;
      }
    };

    var song = new Song();
    r.Song = song;

    // TODO: adding patterns should be handled by the audio app
    r.Song.addPattern();

    r.getSongLengthSeconds = function() {
      return r.ticks2Seconds(r.Song._length);
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
