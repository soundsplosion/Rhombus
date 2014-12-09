//! rhombus.graph.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._graphSetup = function(r) {
    // Set up the audio graph
    // Hardcoded effect for now
    var graph = {};

    var enabled = false;
    r.getEffectEnabled = function() {
      return enabled;
    };
    
    var inGain = r._ctx.createGain();
    var delay = r._ctx.createDelay();
    delay.delayTime.value = 3/8;

    var feedbackGain = r._ctx.createGain();
    feedbackGain.gain.value = 0.4;

    var masterOutGain = r._ctx.createGain();
    r.getMasterGain = function() {
      return masterOutGain.gain.value;
    };
    r.setMasterGain = function(gain) {
      masterOutGain.gain.value = gain;
    };

    var dryGain = r._ctx.createGain();
    dryGain.gain.value = 1.0;

    var preGain = r._ctx.createGain();
    var wetGain = r._ctx.createGain();
    wetGain.gain.value = 0.0;

    // this controls the level of the delay
    var wetLevel = 0.5;
    r.getWetLevel = function () {
      return wetLevel;
    };
    r.setWetLevel = function (level) {
      wetLevel = level;
      if (enabled)
        wetGain.gain.value = level;
    };

    // this controls the feedback amount
    var feedbackLevel = 0.5;
    r.getFeedbackLevel = function () {
      return feedbackLevel;
    };
    r.setFeedbackLevel = function (level) {
      feedbackLevel = level;
      feedbackGain.gain.value = level;
    };    
    
    // direct signal control
    inGain.connect(dryGain);
    dryGain.connect(masterOutGain);

    // shut of input to the delay when the effect is disabled
    inGain.connect(preGain);

    // feedback control
    delay.connect(feedbackGain);
    feedbackGain.connect(delay);

    // effect level control
    preGain.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(masterOutGain);

    masterOutGain.connect(r._ctx.destination);

    graph.mainout = inGain;
    r._graph = graph;

    var on = false;
    r.isEffectOn = function() {
      return on;
    };

    r.setEffectOn = function(enable) { 
      if (enable) {
        enabled = true;
        //wetGain.gain.value = wetLevel;
        preGain.gain.value = 1.0;
      } else {
        enabled = false;
        //wetGain.gain.value = 0.0;
        preGain.gain.value = 0.0;
      }
    };

    r.setEffectOn(false);
  };
})(this.Rhombus);
