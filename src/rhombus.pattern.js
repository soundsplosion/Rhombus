//! rhombus.pattern.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._patternSetup = function(r) {
    
    var patternId = 0;

    r.Pattern = function() {
      this.notes = new Array();
      this.notesMap = {};
      this._id = patternId;
      patternId = patternId + 1;
      console.log("creating new pattern with ID " + this._id);
    };

  };

})(this.Rhombus);
