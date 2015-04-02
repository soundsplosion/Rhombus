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
        return this._recordEnabled = enabled;
      }
    };

    // Temporary buffer for RtNotes which have been recorded
    var recordBuffer = new Array();

    // Adds an RtNote with the given parameters to the record buffer
    r.Record.addToBuffer = function(pitch, velocity, start, end) {
      // TODO: 'length' would probably be better than 'end'
      var rtNote = new r.RtNote(pitch, velocity, start, end);

      if (isDefined(rtNote)) {
        recordBuffer.push(rtNote);
      }
      else {
        console.log("[Rhombus.Edit] - rtNote is undefined");
      }
    };

    // Dumps the buffer of recorded RtNotes as a Note array, most probably
    // to be inserted into a new or existing pattern
    r.Record.dumpBuffer = function() {
      if (recordBuffer.length < 1) {
        return undefined;
      }

      var notes = new Array();
      for (var i = 0; i < recordBuffer.length; i++) {
        var rtNote = recordBuffer[i];
        var note = new r.Note(+rtNote._pitch,
                              Math.round(r.seconds2Ticks(rtNote._start)),
                              Math.round(r.seconds2Ticks(rtNote._end - rtNote._start)),
                              rtNote._velocity);

        // TODO: Decide if this define guard is redundant
        if (isDefined(note)) {
          notes.push(note);
        }
        else {
          console.log("[Rhombus.Edit] - note is undefined");
        }
      }

      // TODO: might want to clear the buffer before returning
      return notes;
    }

    r.Record.clearBuffer = function() {
      recordBuffer.splice(0, recordBuffer.length);
    };
  };
})(this.Rhombus);
