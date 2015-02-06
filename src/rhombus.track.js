//! rhombus.track.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  Rhombus._trackSetup = function(r) {

    r.PlaylistItem = function(ptnId, start, length, id) {
      if (id) {
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
        if (typeof start === 'undefined') {
          return undefined;
        }

        var startVal = parseInt(start);
        if (startVal < 0) {
          return undefined;
        }

        return this._start = startVal;
      },

      getStart: function() {
        return this._start;
      },

      setLength: function(length) {
        if (typeof length === 'undefined') {
          return undefined;
        }

        var lenVal = parseInt(length);
        if (lenVal < 0) {
          return undefined;
        }

        return this._length = lenVal;
      },

      getLength: function() {
        return this._length;
      }
    };

    r.RtNote = function(pitch, start, end) {
      r._newRtId(this);
      this._pitch = pitch || 60;
      this._start = start || 0;
      this._end = end || 0;
    };

    r.Track = function(id) {
      if (id) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // track metadata
      this._name = "Default Track Name";

      // track structure data
      this._targets = {};
      this._playingNotes = {};

      // TODO: define some kind of pattern playlist
      this._playlist = {};
    };

    r.Track.prototype = {
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

      addToPlaylist: function(ptnId, start, end) {
        // ptnId myst belong to an existing pattern
        if (r._song._patterns[ptnId] === undefined)
          return undefined;

        // All arguments must be defined
        if (ptnId === undefined || start === undefined || end === undefined)
          return undefined;

        // Minimum item length is 480 ticks (1 beat)
        if ((end - start) < 480)
          return undefined;

        // Don't allow overlapping patterns
        if (this.checkOverlap(start, end))
          return undefined;

        var newItem = new r.PlaylistItem(ptnId, start, end);
        this._playlist[newItem._id] = newItem;
        return newItem._id;
      },

      removeFromPlaylist: function(itemId) {
        if (!this._playlist.hasOwnProperty(itemId.toString()))
          return undefined;
        else
          delete this._playlist[itemId.toString()];

        return itemId;
      }
    };
  };
})(this.Rhombus);
