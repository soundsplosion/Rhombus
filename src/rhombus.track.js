//! rhombus.track.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  Rhombus._trackSetup = function(r) {

    r.PlaylistItem = function(trkId, ptnId, start, length, id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      this._trkId = trkId;
      this._ptnId = ptnId;
      this._start = start;
      this._length = length;
      this._selected = false;
    };

    r.PlaylistItem.prototype = {

      setStart: function(start) {
        if (notDefined(start)) {
          return undefined;
        }

        var startVal = parseInt(start);
        if (startVal < 0) {
          return undefined;
        }

        var oldStart = this._start;
        var that = this;
        r.Undo._addUndoAction(function() {
          that._start = oldStart;
        });

        return this._start = startVal;
      },

      getStart: function() {
        return this._start;
      },

      setLength: function(length) {
        if (notDefined(length)) {
          return undefined;
        }

        var lenVal = parseInt(length);
        if (lenVal < 0) {
          return undefined;
        }

        var oldLength = this._length;
        var that = this;
        r.Undo._addUndoAction(function() {
          that._length = oldLength;
        });

        return this._length = lenVal;
      },

      getLength: function() {
        return this._length;
      },

      getTrackIndex: function() {
        return r._song._tracks.getSlotById(this._trkId);
      },

      getPatternId: function() {
        return this._ptnId;
      },

      // TODO: factor out shared selection code
      select: function() {
        return (this._selected = true);
      },

      deselect: function() {
        return (this._selected = false);
      },

      toggleSelect: function() {
        return (this._selected = !this._selected);
      },

      getSelected: function() {
        return this._selected;
      },

      setSelected: function(select) {
        return (this._selected = select);
      },

      toJSON: function() {
        var jsonObj = {
          "_id"     : this._id,
          "_trkId"  : this._trkId,
          "_ptnId"  : this._ptnId,
          "_start"  : this._start,
          "_length" : this._length,
        };
        return jsonObj;
      }
    };

    r.RtNote = function(pitch, velocity, start, end, target) {
      r._newRtId(this);
      this._pitch    = (isNaN(pitch) || notDefined(pitch)) ? 60 : pitch;
      this._velocity = +velocity || 0.5;
      this._start    = start || 0;
      this._end      = end || 0;
      this._target   = target;

      return this;
    };

    function Track(id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // track metadata
      this._name = "Default Track Name";
      this._mute = false;
      this._solo = false;

      // track structure data
      this._targets = [];
      this._effectTargets = [];
      this._playingNotes = {};
      this._playlist = {};

      this._graphSetup(0, 0, 0, 1);
    };
    r._addGraphFunctions(Track);
    r.Track = Track;

    Track.prototype._graphType = "track";

    Track.prototype.setId = function(id) {
      this._id = id;
    };

    Track.prototype.getName = function() {
      return this._name;
    };

    Track.prototype.setName = function(name) {
      if (notDefined(name)) {
        return undefined;
      }
      else {
        var oldValue = this._name;
        this._name = name.toString();

        var that = this;
        r.Undo._addUndoAction(function() {
          that._name = oldValue;
        });

        return this._name;
      }
    };

    Track.prototype.getMute = function() {
      return this._mute;
    };

    Track.prototype.setMute = function(mute) {
      if (typeof mute !== "boolean") {
        return undefined;
      }

      var oldMute = this._mute;
      var that = this;
      r.Undo._addUndoAction(function() {
        that._mute = oldMute;
      });

      this._mute = mute;

      if (mute) {
        this.killAllNotes();
      }

      return mute;
    };

    Track.prototype.toggleMute = function() {
      return this.setMute(!this.getMute());
    };

    Track.prototype.getSolo = function() {
      return this._solo;
    };

    Track.prototype.setSolo = function(solo) {
      if (typeof solo !== "boolean") {
        return undefined;
      }

      var soloList = r._song._soloList;

      var oldSolo = this._solo;
      var oldSoloList = soloList.slice(0);
      var that = this;
      r.Undo._addUndoAction(function() {
        that._solo = oldSolo;
        r._song._soloList = oldSoloList;
      });

      // Get the index of the current track in the solo list
      var index = soloList.indexOf(this._id);

      // The track is solo'd and solo is 'false'
      if (index > -1 && !solo) {
        soloList.splice(index, 1);
      }
      // The track is not solo'd and solo is 'true'
      else if (index < 0 && solo) {
        soloList.push(this._id);
      }

      this._solo = solo;
      return solo;
    };

    Track.prototype.toggleSolo =function() {
      return this.setSolo(!this.getSolo());
    };

    Track.prototype.getPlaylist =function() {
      return this._playlist;
    };

    // Determine if a playlist item exists that overlaps with the given range
    Track.prototype.checkOverlap = function(start, end) {
      for (var itemId in this._playlist) {
        var item = this._playlist[itemId];
        var itemStart = item._start;
        var itemEnd = item._start + item._length;

        // TODO: verify and simplify this logic
        if (start < itemStart && end > itemStart) {
          return true;
        }

        if (start >= itemStart && end < itemEnd) {
          return true;
        }

        if (start >= itemStart && start < itemEnd) {
          return true;
        }
      }

      // No overlapping items found
      return false;
    };

    Track.prototype.addToPlaylist = function(ptnId, start, length) {
      // All arguments must be defined
      if (notDefined(ptnId) || notDefined(start) || notDefined(length)) {
        return undefined;
      }

      // Don't allow overlapping playlist items
      if (this.checkOverlap(start, start+length)) {
        return undefined;
      }

      // ptnId myst belong to an existing pattern
      if (notDefined(r._song._patterns[ptnId])) {
        return undefined;
      }

      var newItem = new r.PlaylistItem(this._id, ptnId, start, length);
      this._playlist[newItem._id] = newItem;

      var that = this;
      r.Undo._addUndoAction(function() {
        delete that._playlist[newItem._id];
      });

      return newItem._id;

      // TODO: restore length checks
    };

    Track.prototype.getPlaylistItemById = function(id) {
      return this._playlist[id];
    };

    Track.prototype.getPlaylistItemByTick = function(tick) {
      var playlist = this._playlist;
      for (var itemId in playlist) {
        var item = playlist[itemId];
        var itemEnd = item._start + item._length;
        if (tick >= item._start && tick < itemEnd) {
          return item;
        }
      }

      // no item at this location
      return undefined;
    };

    Track.prototype.removeFromPlaylist = function(itemId) {
      console.log("[Rhombus] - deleting playlist item " + itemId);
      itemId = itemId.toString();
      if (!(itemId in this._playlist)) {
        return undefined;
      } else {

        var obj = this._playlist[itemId];
        var that = this;
        r.Undo._addUndoAction(function() {
          that._playlist[itemId] = obj;
        });

        delete this._playlist[itemId.toString()];
      }

      return itemId;
    };

    Track.prototype.killAllNotes = function() {
      var playingNotes = this._playingNotes;

      for (var rtNoteId in playingNotes) {
        r._song._instruments.objIds().forEach(function(instId) {
          r._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
        });
        delete playingNotes[rtNoteId];
      }
    };

    Track.prototype.toJSON = function() {
      var toReturn = {};
      toReturn._id = this._id;
      toReturn._name = this._name;
      toReturn._playlist = this._playlist;
      toReturn._graphOutputs = this._graphOutputs;
      toReturn._graphInputs = this._graphInputs;
      return toReturn;
    };

    Track.prototype.exportEvents = function() {
      var events = new AVL();
      var playlist = this._playlist;
      for (var itemId in playlist) {
        var srcPtn = r.getSong().getPatterns()[playlist[itemId]._ptnId];
        var notes = srcPtn.getAllNotes();

        for (var i = 0; i < notes.length; i++) {
          var note  = notes[i];
          var start = Math.round(note.getStart() + playlist[itemId]._start);
          var end   = start + Math.round(note.getLength());
          var vel   = Math.round(note.getVelocity() * 127);

          // insert the note-on and note-off events
          events.insert(start, [ 0x90, note.getPitch(), vel ]);
          events.insert(end,   [ 0x80, note.getPitch(), 64 ]);
        }
      }

      return events;
    };

    Track.prototype._internalGraphConnect = function(output, b, bInput) {
      if (b.isInstrument()) {
        this._targets.push(b._id);
      } else if (b.isEffect()) {
        this._effectTargets.push(b._id);
      }
    };

    Track.prototype._internalGraphDisconnect = function(output, b, bInput) {
      console.log("removing track connection");
      var toSearch;
      if (b.isInstrument()) {
        toSearch = this._targets;
      } else if (b.isEffect()) {
        toSearch = this._effectTargets;
      }

      if (notDefined(toSearch)) {
        return;
      }

      var idx = toSearch.indexOf(b._id);
      if (idx >= 0) {
        toSearch.splice(idx, 1);
      }
    };

  };
})(this.Rhombus);
