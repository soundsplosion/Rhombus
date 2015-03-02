//! rhombus.master.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {

  Rhombus.Master = function() {
    Tone.Effect.call(this);
    this.setDry(1);
    this.toMaster();
    this.isMaster = function() { return true; };
  }
  Tone.extend(Rhombus.Master, Tone.Effect);

})(this.Rhombus);
