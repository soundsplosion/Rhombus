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

    r.Track = function(id) {
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
      this._target = undefined;
      this._playingNotes = {};
      this._playlist = {};
    };

    r.Track.prototype = {

      setId: function(id) {
        this._id = id;
      },

      getName: function() {
        return this._name;
      },

      setName: function(name) {
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
      },

      getMute: function() {
        return this._mute;
      },

      setMute: function(mute) {
        if (typeof mute !== "boolean") {
          return undefined;
        }

        var oldMute = this._mute;
        var that = this;
        r.Undo._addUndoAction(function() {
          that._mute = oldMute;
        });

        this._mute = mute;
        return mute;
      },

      toggleMute: function() {
        return this.setMute(!this.getMute());
      },

      getSolo: function() {
        return this._solo;
      },

      setSolo: function(solo) {
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
      },

      toggleSolo: function() {
        return this.setSolo(!this.getSolo());
      },

      getPlaylist: function() {
        return this._playlist;
      },

      // Determine if a playlist item exists that overlaps with the given range
      checkOverlap: function(start, end) {
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
      },

      addToPlaylist: function(ptnId, start, length) {
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
      },

      getPlaylistItemById: function(id) {
        return this._playlist[id];
      },

      getPlaylistItemByTick: function(tick) {
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
      },

      removeFromPlaylist: function(itemId) {
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
      },

      toJSON: function() {
        // Don't include "_playingNotes"
        var toReturn = {};
        toReturn._id = this._id;
        toReturn._name = this._name;
        toReturn._target = this._target;
        toReturn._playlist = this._playlist;
        return toReturn;
      }
    };
  };
})(this.Rhombus);
