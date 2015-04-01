//! rhombus.header.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(root) {

  var rhombs = [];

  // Add Rhombus constructor
  root.Rhombus = function() {

    rhombs.push(this);

    this._active = true;
    this._disposed = false;
    this._ctx = Tone.context;
    this._globalTarget = 0;

    this.setActive = function(active) {
      if (this._disposed) {
        return;
      }
      this._active = active;
    };

    this.dispose = function() {
      this.setActive(false);
      this._disposed = true;
      delete this._ctx;
      for (var i = 0; i < rhombs.length; i++) {
        if (rhombs[i] === this) {
          rhombs.splice(i, 1);
          return;
        }
      }
    };

    this.setGlobalTarget = function(target) {
      console.log("[Rhombus] - setting global target to " + target);
      this._globalTarget = +target;
    };

    // This run-time ID is used for IDs that don't need to be exported/imported
    // with the song (e.g., RtNotes)
    var rtId = 0;
    this._newRtId = function(t) {
      Object.defineProperty(t, '_id', {
        value: rtId,
        enumerable: true
      });
      rtId = rtId + 1;
    };

    var curId = 0;
    this._setId = function(t, id) {
      if (id >= curId) {
        curId = id + 1;
      }

      Object.defineProperty(t, '_id', {
        value: id,
        enumerable: true,
      });
    };

    this._newId = function(t) {
      this._setId(t, curId);
    };

    this.setCurId = function(id) {
      curId = id;
    };

    this.getCurId = function() {
      return curId;
    };

    root.Rhombus._undoSetup(this);
    root.Rhombus._graphSetup(this);
    root.Rhombus._patternSetup(this);
    root.Rhombus._trackSetup(this);
    root.Rhombus._songSetup(this);
    root.Rhombus._paramSetup(this);
    root.Rhombus._recordSetup(this);

    // Instruments
    root.Rhombus._instrumentSetup(this);
    root.Rhombus._wrappedInstrumentSetup(this);
    root.Rhombus._samplerSetup(this);

    // Effects
    root.Rhombus._effectSetup(this);
    root.Rhombus._masterSetup(this);
    root.Rhombus._wrappedEffectSetup(this);

    root.Rhombus._timeSetup(this);
    root.Rhombus._editSetup(this);

    // MIDI
    root.Rhombus._midiSetup(this);

    this.initSong();
  };

})(this);
