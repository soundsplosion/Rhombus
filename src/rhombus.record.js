//! rhombus.record.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {
  Rhombus._recordSetup = function(r) {
    r.Record = {};

    r._recordEnabled = false;

    r.getRecordEnabled = function() {
      return this._recordEnabled;
    };

    r.setRecordEnabled = function(enabled) {
      if (typeof enabled === "boolean") {
        document.dispatchEvent(new CustomEvent("rhombus-recordenable", {"detail": enabled}));
        return this._recordEnabled = enabled;
      }
    };

    // Temporary buffer for RtNotes which have been recorded
    var recordBuffer = new Array();

    // Adds an RtNote with the given parameters to the record buffer
    r.Record.addToBuffer = function(rtNote) {
      if (isDefined(rtNote)) {

        var note = new r.Note(rtNote._pitch,
                              Math.round(rtNote._start),
                              Math.round(rtNote._end - rtNote._start),
                              rtNote._velocity);

        if (isDefined(note)) {
          recordBuffer.push(note);
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
    r.Record.dumpBuffer = function() {
      if (recordBuffer.length < 1) {
        return undefined;
      }

      return recordBuffer.slice();
    }

    r.Record.clearBuffer = function() {
      recordBuffer.splice(0, recordBuffer.length);
    };
  };
})(this.Rhombus);
