//! rhombus.graph.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(r) {

  // Set up the audio graph
  // Hardcoded effect for now
  var graph = {};

  var inGain = r._ctx.createGain();
  var delay = r._ctx.createDelay();
  delay.delayTime.value = 3/8;
  var feedbackGain = r._ctx.createGain();
  feedbackGain.gain.value = 0.7;

  inGain.connect(r._ctx.destination);
  delay.connect(feedbackGain);
  feedbackGain.connect(delay);
  delay.connect(r._ctx.destination);

  graph.mainout = inGain;
  r._graph = graph;

  var on = false;
  r.isEffectOn = function() {
    return on;
  };

  r.setEffectOn = function(o) {
    if (o !== on) {
      if (o) {
        inGain.disconnect();
        inGain.connect(delay);
      } else {
        inGain.disconnect();
        inGain.connect(r._ctx.destination);
      }
    }
  };

})(this.Rhombus);
