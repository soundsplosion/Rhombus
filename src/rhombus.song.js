//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._songSetup = function(r) {

    Song = function() {
      // song metadata
      this._title  = "Default Song Title";
      this._artist = "Default Song Artist";
      
      // song structure data
      this._tracks = {};
      this._patterns = {};
      this._instruments = {};
    };

    Song.prototype = {
      setTitle: function(title) {
        this._title = title;
      },

      getTitle: function() {
        return this._title;
      },

      setArtist: function(artist) {
        this._artist = artist;
      },

      getArtist: function() {
        return this._artist;
      },

      addPattern: function(pattern) {        
        if (pattern === undefined) {
          var pattern = new r.Pattern();
        }
        this._patterns[pattern._id] = pattern;
        return pattern._id;
      }
    };

    r._song = new Song();

    r.getSongLengthSeconds = function() {
      return r.ticks2Seconds(r.Song._length);
    };

    // TODO: refactor to handle multiple tracks, patterns, etc.
    //       patterns, etc., need to be defined first, of course...
    r.importSong = function(json) {
      r._song = new Song();
      r._song.setTitle(JSON.parse(json)._title);
      r._song.setArtist(JSON.parse(json)._artist);

      var tracks      = JSON.parse(json)._tracks;
      var patterns    = JSON.parse(json)._patterns;
      var instruments = JSON.parse(json)._instruments;

      // there has got to be a better way to deserialize things...
      for (var ptnId in patterns) {
        var pattern = patterns[ptnId];
        var noteMap = pattern._noteMap;

        var newPattern = new r.Pattern();

        newPattern._name = pattern._name;
        newPattern._id = pattern._id;

        // dumbing down Note (e.g., by removing methods from its
        // prototype) might make deserializing much easier
        for (var noteId in noteMap) {
          var note = new r.Note(noteMap[noteId]._pitch,
                                noteMap[noteId]._start,
                                noteMap[noteId]._length,
                                noteMap[noteId].id);

          newPattern._noteMap[noteId] = note;
        }

        r._song._patterns[ptnId] = newPattern;
      }

      // TODO: tracks and instruments will need to be imported
      //       in a similar manner
    }

    r.exportSong = function() {
      return JSON.stringify(r._song);
    };

  };
})(this.Rhombus);
