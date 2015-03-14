//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._songSetup = function(r) {

    Song = function() {
      // song metadata
      this._title  = "Default Song Title";
      this._artist = "Default Song Artist";
      this._length = 1920;
      this._bpm    = 120;

      this._loopStart = 0;
      this._loopEnd   = 1920;

      // song structure data
      this._tracks = new Rhombus.Util.IdSlotContainer(16);
      this._patterns = {};
      this._instruments = new Rhombus.Util.IdSlotContainer(16);
      this._effects = {};
      this._soloList = [];

      this._curId = 0;
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
        if (isDefined(length) && length >= 480) {
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

      getPatterns: function() {
        return this._patterns;
      },

      addPattern: function(pattern) {
        if (notDefined(pattern)) {
          var pattern = new r.Pattern();
        }
        this._patterns[pattern._id] = pattern;

        var rthis = this;
        r.Undo._addUndoAction(function() {
          delete rthis._patterns[pattern._id];
        });

        return pattern._id;
      },

      deletePattern: function(ptnId) {
        console.log("[Rhombus] - deleting ptnId " + ptnId);
        var pattern = this._patterns[ptnId];

        if (notDefined(pattern)) {
          return undefined;
        }

        var rthis = this;
        r.Undo._addUndoAction(function() {
          rthis._patterns[ptnId] = pattern;
        });

        // TODO: make this action undoable
        // remove all instances of the deleted pattern from track playlists
        r._song._tracks.objIds().forEach(function(trkId) {
          var track = r._song._tracks.getObjById(trkId);
          for (var itemId in track._playlist) {
            var item = track._playlist[itemId];
            if (+item._ptnId == +ptnId) {
              track.removeFromPlaylist(itemId);
            }
          }
        });

        delete this._patterns[ptnId];
        return ptnId;
      },

      addTrack: function() {
        // Create a new Track object
        var track = new r.Track();
        this._tracks.addObj(track);

        var rthis = this;
        r.Undo._addUndoAction(function() {
          rthis._tracks.removeObj(track);
        });

        // Return the ID of the new Track
        return track._id;
      },

      deleteTrack: function(trkId) {
        trkId = +trkId;
        var track = this._tracks.getObjById(trkId);

        if (notDefined(track)) {
          return undefined;
        }
        else {
          // TODO: find a more robust way to terminate playing notes
          for (var rtNoteId in this._playingNotes) {
            var note = this._playingNotes[rtNoteId];
            r._song._instruments.getObjById(track._target).triggerRelease(rtNoteId, 0);
            delete this._playingNotes[rtNoteId];
          }

          // TODO: Figure out why this doesn't work
          //r.removeInstrument(track._target);

          // Remove the track from the solo list, if it's soloed
          var index = r._song._soloList.indexOf(track._id);
          if (index > -1) {
            r._song._soloList.splice(index, 1);
          }

          var slot = this._tracks.getSlotById(trkId);
          var track = this._tracks.removeId(trkId);

          var rthis = this;
          r.Undo._addUndoAction(function() {
            rthis._tracks.addObj(track, slot);
          });

          return trkId;
        }
      },

      getTracks: function() {
        return this._tracks;
      },

      getInstruments: function() {
        return this._instruments;
      },

      getEffects: function() {
        return this._effects;
      },

      // Song length here is defined as the end of the last
      // playlist item on any track
      findSongLength: function() {
        var length = 0;
        var thisSong = this;

        this._tracks.objIds().forEach(function(trkId) {
          var track = thisSong._tracks.getObjById(trkId);

          for (var itemId in track._playlist) {
            var item = track._playlist[itemId];
            var itemEnd = item._start + item._length;

            if (itemEnd > length) {
              length = itemEnd;
            }
          }
        });

        return length;
      }
    };

    r.getSongLengthSeconds = function() {
      return this.ticks2Seconds(this._song._length);
    };

    r.initSong = function() {
      r._song = new Song();
    };

    r.initSong();

    r.importSong = function(json) {
      this._song = new Song();
      var parsed = JSON.parse(json);
      this._song.setTitle(parsed._title);
      this._song.setArtist(parsed._artist);
      this._song._length = parsed._length || 1920;
      this._song._bpm = parsed._bpm || 120;

      this._song._loopStart = parsed._loopStart || 0;
      this._song._loopEnd = parsed._loopEnd || 1920;

      var tracks      = parsed._tracks;
      var patterns    = parsed._patterns;
      var instruments = parsed._instruments;
      var effects     = parsed._effects;

      for (var ptnId in patterns) {
        var pattern = patterns[ptnId];
        var noteMap = pattern._noteMap;

        var newPattern = new this.Pattern(+ptnId);

        newPattern._name = pattern._name;
        newPattern._length = pattern._length;

        if (isDefined(pattern._color)) {
          newPattern.setColor(pattern._color);
        }

        // dumbing down Note (e.g., by removing methods from its
        // prototype) might make deserializing much easier
        for (var noteId in noteMap) {
          var note = new this.Note(+noteMap[noteId]._pitch,
                                   +noteMap[noteId]._start,
                                   +noteMap[noteId]._length,
                                   +noteMap[noteId]._velocity || 1,
                                   +noteId);

          newPattern._noteMap[+noteId] = note;
        }

        this._song._patterns[+ptnId] = newPattern;
      }

      for (var trkIdIdx in tracks._slots) {
        var trkId = +tracks._slots[trkIdIdx];
        var track = tracks._map[trkId];
        var playlist = track._playlist;

        // Create a new track and manually set its ID
        var newTrack = new this.Track(trkId);

        newTrack._name = track._name;
        newTrack._target = +track._target;

        for (var itemId in playlist) {
          var item = playlist[itemId];
          var parentId = trkId;

          if (isDefined(item._trkId)) {

          }

          var newItem = new this.PlaylistItem(parentId,
                                              item._ptnId,
                                              item._start,
                                              item._length,
                                              item._id);

          newTrack._playlist[+itemId] = newItem;
        }

        this._song._tracks.addObj(newTrack, trkIdIdx);
      }

      for (var instIdIdx in instruments._slots) {
        var instId = instruments._slots[instIdIdx];
        var inst = instruments._map[instId];
        this.addInstrument(inst._type, inst._params, inst._graphChildren, inst._graphParents, +instId, instIdIdx);
        this._song._instruments.getObjById(instId)._normalizedObjectSet({ volume: 0.1 });
      }

      for (var effId in effects) {
        var eff = effects[effId];
        this.addEffect(eff._type, eff._params, eff._graphChildren, eff._graphParents, +effId);
      }

      this._importFixGraph();

      // restore curId -- this should be the last step of importing
      var curId;
      if (notDefined(parsed._curId)) {
        console.log("[Rhombus Import] curId not found -- beware");
      }
      else {
        this.setCurId(parsed._curId);
      }

    };

    r.exportSong = function() {
      this._song._curId = this.getCurId();
      this._song._length = this._song.findSongLength();
      return JSON.stringify(this._song);
    };

    r.getSong = function() {
      return this._song;
    };
  };
})(this.Rhombus);
