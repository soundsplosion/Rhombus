//! rhombus.util.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(r) {

  r.Util = {};

  // Converts a note-number (typical range 0-127) into a frequency value
  // We'll probably just want to pre-compute a table...
  r.Util.noteNum2Freq = function (noteNum) {
    var freq =  Math.pow(2, (noteNum-69)/12) * 440;
    return freq;
  }

})(this.Rhombus);
