//! rhombus.sampler.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._samplerSetup = function(r) {

    function Sampler(buffers) {
      Tone.Instrument.call(this);

      this.samps = [];
      this.setBuffers(buffers);
    }

    Tone.extend(Sampler, Tone.Instrument);

    Sampler.prototype.setBuffers = function(buffers) {
      this.killAllNotes();
      this.samps = [];
      buffers.forEach(function(buff) {
        var sampler = new Tone.Sampler();
        sampler.setBuffer(buff);
        this.samps.push(sampler);
      });
    };

  };
})(this.Rhombus);
