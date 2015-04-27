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

Rhombus.prototype.setRecordEnabled = function(enabled, item) {
  if (typeof enabled === "boolean") {
    if (isDefined(item) && enabled === true) {
      this.stopPlayback();
      this.moveToPositionTicks(item._start);
    }
    document.dispatchEvent(new CustomEvent("rhombus-recordenable", {"detail": enabled}));
    return this.Record._recordEnabled = enabled;
  }
  else {
    document.dispatchEvent(new CustomEvent("rhombus-recordenable", {"detail": false}));
    return this.Record._recordEnabled = false;
  }
};

// Adds an RtNote with the given parameters to the record buffer
Rhombus.Record.prototype.addToBuffer = function(rtNote) {
  if (isDefined(rtNote)) {
    var noteStart  = Math.round(rtNote._start);
    var noteLength = Math.round(rtNote._end - rtNote._start);

    // force the values into a safe range
    noteStart = (noteStart > 0) ? noteStart : 0;
    noteLength = (noteLength >= 15) ? noteLength : 15;

    var note = new Rhombus.Note(rtNote._pitch,
                                noteStart,
                                noteLength,
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
