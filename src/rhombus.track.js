//! rhombus.track.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  Rhombus._trackSetup = function(r) {

    r.PlaylistItem = function(ptnId, start, length, id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

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
        var rthis = this;
        r.Undo._addUndoAction(function() {
          rthis._start = oldStart;
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
        var rthis = this;
        r.Undo._addUndoAction(function() {
          rthis._length = oldLength;
        });

        return this._length = lenVal;
      },

      getLength: function() {
        return this._length;
      },

      getPatternId: function() {
        return this._ptnId;
      }
    };

    r.RtNote = function(pitch, start, end, target) {
      r._newRtId(this);
      this._pitch = pitch || 60;
      this._start = start || 0;
      this._end = end || 0;
      this._target = target;
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

          r.Undo._addUndoAction(function() {
            this._name = oldValue;
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
        for (var id in this._playlist) {
          var item = this._playlist[id];
          var itemEnd = item._start + item._length;

          if (item._start <= start && itemEnd > start)
            return true;

          if (itemEnd > start && itemEnd < end)
            return true;

          if (item._start <= start && itemEnd >= end)
            return true;

          if (start <= item._start && end >= itemEnd)
            return true;
        }

        // No overlapping items found
        return false;
      },

      addToPlaylist: function(ptnId, start, length) {
        // All arguments must be defined
        if (notDefined(ptnId) || notDefined(start) || notDefined(length)) {
          return undefined;
        }

        // ptnId myst belong to an existing pattern
        if (notDefined(r._song._patterns[ptnId])) {
          return undefined;
        }

        var newItem = new r.PlaylistItem(ptnId, start, length);
        this._playlist[newItem._id] = newItem;

        var rthis = this;
        r.Undo._addUndoAction(function() {
          delete rthis._playlist[newItem._id];
        });

        return newItem._id;

        // TODO: restore these length and overlap checks
      },

      removeFromPlaylist: function(itemId) {
        itemId = itemId.toString();
        if (!(itemId in this._playlist)) {
          return undefined;
        } else {

          var obj = this._playlist[itemId];
          var rthis = this;
          r.Undo._addUndoAction(function() {
            rthis._playlist[itemId] = obj;
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
