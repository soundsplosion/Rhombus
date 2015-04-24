//! rhombus.record.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {
  Rhombus._recordSetup = function(r) {
    r.Record = {};

    r._recordBuffer = new r.Pattern();

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

    // Adds an RtNote with the given parameters to the record buffer
    r.Record.addToBuffer = function(rtNote) {
      if (isDefined(rtNote)) {
        var note = new r.Note(rtNote._pitch,
                              Math.round(rtNote._start),
                              Math.round(rtNote._end - rtNote._start),
                              rtNote._velocity);

        if (isDefined(note)) {
          r._recordBuffer.addNote(note);
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
    r.Record.dumpBuffer = function() {
      if (r._recordBuffer.length < 1) {
        return undefined;
      }

      return r._recordBuffer.getAllNotes();
    }

    r.Record.clearBuffer = function() {
      r._recordBuffer.deleteNotes(r._recordBuffer.getAllNotes());
    };
  };
})(this.Rhombus);
