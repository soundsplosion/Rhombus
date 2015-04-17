//! rhombus.effect.master.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {
  Rhombus._masterSetup = function(r) {
    function Master() {
      Tone.Effect.call(this);
      this.effectSend.connect(this.effectReturn);
      this.setDry(1);
      this.toMaster();
    }
    Tone.extend(Master, Tone.Effect);
    r._addEffectFunctions(Master);
    Master.prototype.isMaster = function() { return true; };
    r._Master = Master;

    Master.prototype._unnormalizeMap = r._makeEffectMap({});

    Master.prototype.displayName = function() {
      return "Master";
    };

  };
})(this.Rhombus);
