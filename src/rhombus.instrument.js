//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(r) {

  // A simple instrument to test basic note playback
  // Voice Structure: osc. --> gain --> filter --> gain --> output
  function Instrument() {

    // These variables are to keep track of the playback state
    this._playing = false;
    this._currentNote = undefined;

    // Instantiate the modules for the synth voice
    this._osc = r._ctx.createOscillator();
    this._oscGain = r._ctx.createGain();
    this._filter = r._ctx.createBiquadFilter();
    this._filterGain = r._ctx.createGain();

    // Initialize the synth voice
    this._osc.type = 'square';
    this._osc.start(0);
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

  Instrument.prototype = {
    // Play back a simple synth voice at the pitch specified by the input note
    noteOn: function(note) {

      // Don't play out-of-range notes
      if (note.getPitch() < 0 || note.getPitch() > 127)
        return;

      // Set the 'playing' flag to prevent retrigger before noteOff()
      this._playing = true;
      
      // Keep track of the note that is currently sounding
      this._currentNote = note;

      var start = r._ctx.currentTime;
      var noteFreq = r.Util.noteNum2Freq(note.getPitch());

      // Cancel any of the scheduled AudioParam changes from previous Notes
      this._osc.frequency.cancelScheduledValues(start);
      this._filter.frequency.cancelScheduledValues(start);
      this._oscGain.gain.cancelScheduledValues(start);

      // Immediately set the frequency of the oscillator based on the note
      this._osc.frequency.setValueAtTime(noteFreq, r._ctx.currentTime);

      // Reduce resonance for higher notes to reduce clipping
      this._filter.Q.value = 3 + (1 - note.getPitch() / 127) * 9;

      // Produce a smoothly-decaying volume envelope
      this._oscGain.gain.linearRampToValueAtTime(0.6, start + 0.005);
      this._oscGain.gain.linearRampToValueAtTime(0.4, start + 0.100);

      // Sweep the cutoff frequency for spaced-out envelope effects!
      this._filter.frequency.linearRampToValueAtTime(4000, start + 0.005);
      this._filter.frequency.exponentialRampToValueAtTime(200, start + 0.250);
    },

    // Stop the playback of the currently-sounding note
    noteOff: function(note) {
      this._playing = false;
      this._currentNote = undefined;
      this._oscGain.gain.linearRampToValueAtTime(0.0, r._ctx.currentTime + 0.125);
    },

    killAllNotes: function() {
      if (this._currentNote) {
        this._noteOff(this.currentNote);
      }
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
