//! rhombus.record.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus.Record = function(r) {
  this._r = r;
  this._recordBuffer = new Rhombus.Pattern(r);
  this._recordEnabled = false;
};

Rhombus.prototype.getRecordEnabled = function() {
  return this.Record._recordEnabled;
};

Rhombus.prototype.setRecordEnabled = function(enabled) {
  if (typeof enabled === "boolean") {
    document.dispatchEvent(new CustomEvent("rhombus-recordenable", {"detail": enabled}));
    return this.Record._recordEnabled = enabled;
  }
};

// Adds an RtNote with the given parameters to the record buffer
Rhombus.Record.prototype.addToBuffer = function(rtNote) {
  if (isDefined(rtNote)) {
    var note = new Rhombus.Note(rtNote._pitch,
                                Math.round(rtNote._start),
                                Math.round(rtNote._end - rtNote._start),
                                rtNote._velocity,
                                this._r);

    if (isDefined(note)) {
      this._recordBuffer.addNote(note);
      document.dispatchEvent(new CustomEvent("rhombus-newbuffernote", {"detail": note}));
    }
    else {
      console.log("[Rhombus.Record] - note is undefined");
    }
  }
  else {
    console.log("[Rhombus.Record] - rtNote is undefined");
  }
};

// Dumps the buffer of recorded RtNotes as a Note array, most probably
// to be inserted into a new or existing pattern
Rhombus.Record.prototype.dumpBuffer = function() {
  if (this._recordBuffer.length < 1) {
    return undefined;
  }

  return this._recordBuffer.getAllNotes();
};

Rhombus.Record.prototype.clearBuffer = function() {
  this._recordBuffer.deleteNotes(this._recordBuffer.getAllNotes());
};
