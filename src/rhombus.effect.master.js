//! rhombus.effect.master.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
Rhombus._Master = function() {
  Tone.Effect.call(this);
  this.effectSend.connect(this.effectReturn);
  this.setDry(1);
  this.toMaster();
};
Tone.extend(Rhombus._Master, Tone.Effect);
Rhombus._addEffectFunctions(Rhombus._Master);
Rhombus._Master.prototype.isMaster = function() { return true; };

Rhombus._Master.prototype._unnormalizeMap = Rhombus._makeEffectMap({});

Rhombus._Master.prototype.displayName = function() {
  return "Master";
};
