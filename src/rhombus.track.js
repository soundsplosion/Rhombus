//! rhombus.track.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._trackSetup = function(r) {

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
    };

    r.Track.prototype = {
    };
  };
})(this.Rhombus);
