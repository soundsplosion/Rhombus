//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(r) {

  // A simple instrument to test basic note playback
  // Voice Structure: osc. --> gain --> filter --> gain --> output
  function Trigger(note) {
    this._note = note;

    // Instantiate the modules for this note trigger
    this._osc = r._ctx.createOscillator();
    this._oscGain = r._ctx.createGain();
    this._filter = r._ctx.createBiquadFilter();
    this._filterGain = r._ctx.createGain();

    // Initialize the synth voice
    this._osc.type = "square";
    this._oscGain.gain.value = 0.0;
    this._filter.type = "lowpass";
    this._filter.frequency.value = 0;

    // Make the audio graph connections
    this._osc.connect(this._oscGain);
    this._oscGain.connect(this._filter);
    this._filter.connect(this._filterGain);
    this._filterGain.connect(r._ctx.destination);

    // Attenuate the output from the filter
    this._filterGain.gain.value = 0.5;
  }

  Trigger.prototype = {
    noteOn: function(delay) {
      var start = r._ctx.currentTime + delay;
      var noteFreq = r.Util.noteNum2Freq(this._note.getPitch());

      // Immediately set the frequency of the oscillator based on the note
      this._osc.frequency.setValueAtTime(noteFreq, r._ctx.currentTime);
      this._osc.start(start);

      // Reduce resonance for higher notes to reduce clipping
      this._filter.Q.value = 3 + (1 - this._note.getPitch() / 127) * 9;

      // Produce a smoothly-decaying volume envelope
      this._oscGain.gain.linearRampToValueAtTime(0.6, start + 0.005);
      this._oscGain.gain.linearRampToValueAtTime(0.4, start + 0.010);

      // Sweep the cutoff frequency for spaced-out envelope effects!
      this._filter.frequency.linearRampToValueAtTime(4000, start + 0.005);
      this._filter.frequency.exponentialRampToValueAtTime(200, start + 0.250);
    },

    noteOff: function(delay, note) {
      // just a hack for now
      if (!note || note.getPitch() === this._note.getPitch()) {
        var stop = r._ctx.currentTime + 0.125 + delay;
        this._oscGain.gain.linearRampToValueAtTime(0.0, stop);
        this._osc.stop(stop);
        return true;
      } else {
        return false;
      }
    }
  };

  function Instrument() {
    this._triggers = new Array();
  }

  Instrument.prototype = {
    // Play back a simple synth voice at the pitch specified by the input note
    noteOn: function(note, delay) {

      // Don't play out-of-range notes
      if (note.getPitch() < 0 || note.getPitch() > 127)
        return;

      var trigger = new Trigger(note);
      trigger.noteOn(delay);
      this._triggers.push(trigger);
    },

    // Stop the playback of the currently-sounding note
    noteOff: function(note, delay) {
      var newTriggers = [];
      for (var i = 0; i < this._triggers.length; i++) {
        if (!this._triggers[i].noteOff(delay, note)) {
          newTriggers.push(this._triggers[i]);
        }
      }
      this._triggers = newTriggers;
    },

    killAllNotes: function() {
      for (var i = 0; i < this._triggers.length; i++) {
        this._triggers[i].noteOff(0);
      }
      this._triggers = [];
    }
  };

  // I'm not quite sure how to "install" the default instrument...
  var inst1 = new Instrument();
  r.Instrument = inst1;

  r.startPreviewNote = function(pitch) {
    // TODO: impl
  };

  r.stopPreviewNote = function(pitch) {
    // TODO: impl
  };

})(this.Rhombus);
