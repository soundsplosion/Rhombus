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

        return this._length = lenVal;
      },

      getLength: function() {
        return this._length;
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
      if (id) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // track metadata
      this._name = "Default Track Name";

      // track structure data
      this._target = undefined;
      this._playingNotes = {};

      // TODO: define some kind of pattern playlist
      this._playlist = {};
    };

    r.Track.prototype = {

      getName: function() {
        return this._name;
      },

      setName: function(name) {
        if (notDefined(name)) {
          return undefined;
        }
        else {
          this._name = name.toString();
          return this._name;
        }
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

        var end = start + length;

        // ptnId myst belong to an existing pattern
        if (notDefined(r._song._patterns[ptnId])) {
          return undefined;
        }

        // All arguments must be defined
        if (notDefined(ptnId) || notDefined(start) || notDefined(length)) {
          return undefined;
        }

        // TODO: restore these checks

        /*
        // Minimum item length is 480 ticks (1 beat)
        if (length < 480)
          return undefined;

        // Don't allow overlapping patterns
        if (this.checkOverlap(start, end))
          return undefined;
        */

        var newItem = new r.PlaylistItem(ptnId, start, length);
        this._playlist[newItem._id] = newItem;
        return newItem._id;
      },

      removeFromPlaylist: function(itemId) {
        if (!this._playlist.hasOwnProperty(itemId.toString()))
          return undefined;
        else
          delete this._playlist[itemId.toString()];

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
