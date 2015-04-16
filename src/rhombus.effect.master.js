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

    Master.prototype.set = function(options) {
      Tone.Effect.prototype.set.apply(this, arguments);
      if (isDefined(options) && isDefined(options.gain)) {
        this.input.gain.value = options.gain;
      }
    };

    Master.prototype._unnormalizeMap = {
      "gain" : [Rhombus._map.mapLinear(0, 2), Rhombus._map.rawDisplay, 1.0/2.0]
    };

    Master.prototype.displayName = function() {
      return "Master";
    };

  };
})(this.Rhombus);
