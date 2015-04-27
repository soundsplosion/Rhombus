//! rhombus.header.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

/**
 * Creates a new Rhombus object with the specified constraints.
 * @class
 */
function Rhombus(constraints) {
  if (notDefined(constraints)) {
    constraints = {};
  }

  this._constraints = constraints;
  this._disposed = false;
  this._globalTarget = 0;

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

  /**
   * @member {Rhombus.Midi}
   */
  this.Midi = new Rhombus.Midi(this);

  /**
   * @member {Rhombus.Undo}
   */
  this.Undo = new Rhombus.Undo();

  /**
   * @member {Rhombus.Record}
   */
  this.Record = new Rhombus.Record(this);

  Rhombus._timeSetup(this);
  Rhombus._editSetup(this);

  this.initSong();
};

Object.defineProperty(Rhombus, '_ctx', {
  get: function() {
    return Tone.context;
  }
});

/** Makes this Rhombus instance unusable and releases references to resources. */
Rhombus.prototype.dispose = function() {
  this.disconnectFromCtxOut();
  this._disposed = true;
  delete this._song;
};

/**
 * Sets the global target track. Used for preview notes, MIDI input, etc.
 * @param {number} target - The id of the track to target.
 */
Rhombus.prototype.setGlobalTarget = function(target) {
  this.killAllPreviewNotes();
  this._globalTarget = +target;
};

/** Returns the id of the global target track. */
Rhombus.prototype.getGlobalTarget = function() {
  return this._globalTarget;
};

Rhombus.prototype.disconnectFromCtxOut = function() {
  var master = this.getMaster();
  master.disconnect(Rhombus._ctx.destination);
};
