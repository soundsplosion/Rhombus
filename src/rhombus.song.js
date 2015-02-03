//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._songSetup = function(r) {

    Song = function() {
      // song metadata
      this._title  = "Default Song Title";
      this._artist = "Default Song Artist";
      this._length = 1920; // not really metadata, but it's fixed for now..

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

      setLength: function(length) {
        if (length !== undefined && length >= 480) {
          this._length = length;
          return length;
        }
        else {
          return undefined;
        }
      },

      getLength: function() {
        return this._length;
      },

      addPattern: function(pattern) {
        if (pattern === undefined) {
          var pattern = new r.Pattern();
        }
        this._patterns[pattern._id] = pattern;
        return pattern._id;
      },

      addTrack: function() {
        var track = new r.Track();
        this._tracks[track._id] = track;
        return track._id;
      },

      deleteTrack: function(trkId) {
        var track = this._tracks[trkId];

        if (track === undefined) {
          return undefined;
        }
        else {
          // TODO: find a more robust way to terminate playing notes
          for (var rtNoteId in this._playingNotes) {
            var note = this._playingNotes[rtNoteId];
            r.Instrument.triggerRelease(note._id, 0);
            delete this._playingNotes[rtNoteId];
          }

          delete this._tracks[trkId];
          return trkId;
        }
      }
    };

    r._song = new Song();

    r.getSongLengthSeconds = function() {
      return r.ticks2Seconds(r._song._length);
    };

    r.importSong = function(json) {
      r._song = new Song();
      var parsed = JSON.parse(json);
      r._song.setTitle(parsed._title);
      r._song.setArtist(parsed._artist);

      var tracks      = parsed._tracks;
      var patterns    = parsed._patterns;
      var instruments = parsed._instruments;

      for (var ptnId in patterns) {
        var pattern = patterns[ptnId];
        var noteMap = pattern._noteMap;

        var newPattern = new r.Pattern(pattern._id);

        newPattern._name = pattern._name;

        // dumbing down Note (e.g., by removing methods from its
        // prototype) might make deserializing much easier
        for (var noteId in noteMap) {
          var note = new r.Note(noteMap[noteId]._pitch,
                                noteMap[noteId]._start,
                                noteMap[noteId]._length,
                                +noteId);

          newPattern._noteMap[+noteId] = note;
        }

        r._song._patterns[+ptnId] = newPattern;
      }

      // TODO: tracks and instruments will need to be imported
      //       in a similar manner

      for (var trkId in tracks) {
        var track = tracks[trkId];
        var playlist = track._playlist;

        var newTrack = new r.Track(track._id);

        newTrack._name = track._name;

        for (var itemId in playlist) {
          var item = playlist[itemId];
          var newItem = new r.PlaylistItem(item._ptnId,
                                           item._start,
                                           item._end,
                                           item._id)

          newTrack._playlist[+itemId] = newItem;
        }

        r._song._tracks[+trkId] = newTrack;
      }

      for (var instId in instruments) {
        var inst = instruments[instId];
        r.addInstrument(inst._type, inst._params, +instId);
      }
    }

    r.exportSong = function() {
      return JSON.stringify(r._song);
    };

  };
})(this.Rhombus);
