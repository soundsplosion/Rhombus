//! rhombus.record.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

var thisr;
Rhombus._recordSetup = function(r) {
  thisr = r;
  thisr.Record = {};
  thisr._recordBuffer = new Rhombus.Pattern();
  thisr._recordEnabled = false;
  thisr.getRecordEnabled = getRecordEnabled;
  thisr.setRecordEnabled = setRecordEnabled;
  thisr.Record.addToBuffer = addToBuffer;
  thisr.Record.dumpBuffer = dumpBuffer;
  thisr.Record.clearBuffer = clearBuffer;
}

getRecordEnabled = function() {
  return thisr._recordEnabled;
};

setRecordEnabled = function(enabled) {
  if (typeof enabled === "boolean") {
    document.dispatchEvent(new CustomEvent("rhombus-recordenable", {"detail": enabled}));
    return thisr._recordEnabled = enabled;
  }
};

// Adds an RtNote with the given parameters to the record buffer
addToBuffer = function(rtNote) {
  if (isDefined(rtNote)) {
    var note = new Rhombus.Note(rtNote._pitch,
                                Math.round(rtNote._start),
                                Math.round(rtNote._end - rtNote._start),
                                rtNote._velocity);

    if (isDefined(note)) {
      thisr._recordBuffer.addNote(note);
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
dumpBuffer = function() {
  if (thisr._recordBuffer.length < 1) {
    return undefined;
  }

  return thisr._recordBuffer.getAllNotes();
}

clearBuffer = function() {
  thisr._recordBuffer.deleteNotes(thisr._recordBuffer.getAllNotes());
};
