//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {
    // A simple instrument to test basic note playback
    // Voice Structure: osc. --> gain --> filter --> gain --> output
    function Trigger(id, pitch) {
      this._pitch = pitch;
      this._id = id;

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
      this._filterGain.connect(r._graph.mainout);

      // Attenuate the output from the filter
      this._filterGain.gain.value = 0.5;
    }

    // default envelope parameters for synth voice
    var peakLevel    = 0.4;
    var sustainLevel = 0.200;
    var releaseTime  = 0.250;
    var filterCutoff = 24.0;
    var filterRes    = 6;
    var envDepth     = 3.0;
    var attackTime   = 0.025;
    var decayTime    = 0.250;

    r.setReleaseTime = function(time) {
      if (time >= 0.0)
        releaseTime = time;
    };

    r.getReleaseTime = function() {
      return releaseTime;
    };

    r.setFilterCutoff = function(cutoff) {
      if (cutoff >= 0 && cutoff <= 127)
        filterCutoff = cutoff;
    };

    r.getFilterCutoff = function() {
      return filterCutoff;
    };

    r.setFilterRes = function(resonance) {
      if (resonance >= 0 && resonance <= 24)
        filterRes = resonance;
    };

    r.getFilterRes = function() {
      return filterRes;
    };

    r.setEnvDepth = function(depth) {
      if (depth >= 0.0 && depth <= 19)
        envDepth = depth + 1;
    };

    r.getEnvDepth = function() {
      return envDepth;
    };

    r.setAttackTime = function(attack) {
      if (attack >= 0.0)
        attackTime = attack;
    };

    r.getAttackTime = function() {
      return attackTime;
    };

    r.setDecayTime = function(decay) {
      if (decay >= 0.0)
        decayTime = decay;
    };

    r.getDecayTime = function() {
      return decayTime;
    };

    Trigger.prototype = {
      noteOn: function(delay) {
        var start = r._ctx.currentTime + delay;
        var noteFreq = Rhombus.Util.noteNum2Freq(+this._pitch);
        var filterFreq = Rhombus.Util.noteNum2Freq(+this._pitch + filterCutoff);

        // Immediately set the frequency of the oscillator based on the note
        this._osc.frequency.setValueAtTime(noteFreq, r._ctx.currentTime);
        this._osc.start(start);

        // Reduce resonance for higher notes to reduce clipping
        this._filter.Q.value = (1 - this._pitch / 127) * filterRes;

        // Produce a smoothly-decaying volume envelope
        this._oscGain.gain.setValueAtTime(0.0, start);
        this._oscGain.gain.linearRampToValueAtTime(peakLevel, start + 0.005);
        this._oscGain.gain.linearRampToValueAtTime(sustainLevel, start + 0.050);

        // Sweep the cutoff frequency for spaced-out envelope effects!
        this._filter.frequency.setValueAtTime(filterFreq, start);
        this._filter.frequency.exponentialRampToValueAtTime(filterFreq * envDepth, start + attackTime + 0.005);
        this._filter.frequency.exponentialRampToValueAtTime(filterFreq, start + decayTime + attackTime);
      },

      noteOff: function(delay, id) {
        if (id && id !== this._id) {
          return false;
        }

        var stop = r._ctx.currentTime + delay;

        this._oscGain.gain.cancelScheduledValues(stop);
        this._oscGain.gain.setValueAtTime(sustainLevel, stop);
        this._oscGain.gain.linearRampToValueAtTime(0.0, stop + releaseTime);
        this._osc.stop(stop + releaseTime + 0.125);

        return true;
      }
    };

    function Instrument() {
      this._triggers = new Array();
    }

    Instrument.prototype = {
      // Play back a simple synth voice at the pitch specified by the input note
      noteOn: function(id, pitch, delay) {

        // Don't play out-of-range notes
        if (pitch < 0 || pitch > 127) {
          return;
        }

        var trigger = new Trigger(id, pitch);
        trigger.noteOn(delay);
        this._triggers.push(trigger);
      },

      // Stop the playback of the currently-sounding note
      noteOff: function(id, delay) {
        var newTriggers = [];
        for (var i = 0; i < this._triggers.length; i++) {
          if (!this._triggers[i].noteOff(delay, id)) {
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

    var inst1 = new Instrument();
    r.Instrument = inst1;

    // only one preview note is allowed at a time
    var previewNote = undefined;

    r.startPreviewNote = function(pitch) {
      if (previewNote === undefined) {
        previewNote = new Note(pitch, 0);
        r.Instrument.noteOn(previewNote.id, pitch, 0);
      }
    };

    r.stopPreviewNote = function() {
      if (previewNote !== undefined) {
        r.Instrument.noteOff(previewNote.id, 0);
        previewNote = undefined;
      }
    };
  };
})(this.Rhombus);
