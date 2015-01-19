//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {
    function Instrument() {
      this._toneSynth = new Tone.MonoSynth();
      this._toneSynth.toMaster();
    }

    Instrument.prototype = {
      // Play back a simple synth voice at the pitch specified by the input note
      noteOn: function(id, pitch, delay) {
        // Don't play out-of-range notes
        if (pitch < 0 || pitch > 127) {
          return;
        }

        var freq = Rhombus.Util.noteNum2Freq(pitch);
        if (delay > 0) {
          this._toneSynth.triggerAttack(freq, "+" + delay);
        } else {
          this._toneSynth.triggerAttack(freq);
        }
      },

      // Stop the playback of the currently-sounding note
      noteOff: function(id, delay) {
        if (delay > 0) {
          this._toneSynth.triggerRelease("+" + delay);
        } else {
          this._toneSynth.triggerRelease();
        }
      },

      killAllNotes: function() {
        this._toneSynth.triggerRelease();
      }
    };

    var inst1 = new Instrument();
    r.Instrument = inst1;

    // only one preview note is allowed at a time
    var previewNote = undefined;

    r.startPreviewNote = function(pitch) {
      if (previewNote === undefined) {
        previewNote = new r.Note(pitch, 0);
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
