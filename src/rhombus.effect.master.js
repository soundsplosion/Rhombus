//! rhombus.effect.master.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {
  Rhombus._masterSetup = function(r) {
    function Master() {
      Tone.Effect.call(this);
      this.setDry(1);
      this.toMaster();
      this.isMaster = function() { return true; };
    }
    Tone.extend(Master, Tone.Effect);
    r._addEffectFunctions(Master);
    r._Master = Master;

    Master.prototype._unnormalizeMap = {};
    Master.prototype.displayName = function() {
      return "Master";
    };

  };
})(this.Rhombus);
