//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

    var typeMap = {
      "mono" : Tone.MonoSynth,
      "am"   : Tone.AMSynth,
      "fm"   : Tone.FMSynth,
      "pluck": Tone.PluckSynth,
      "noise": Tone.NoiseSynth,
      "samp" : Tone.MultiSampler,
      "duo"  : Tone.DuoSynth
    };

    function Instrument(type, options) {
      var ctr = typeMap[type];
      if (ctr === null || ctr === undefined) {
        ctr = Tone.MonoSynth;
      }

      this._ctr = ctr;
      Tone.PolySynth.call(this, null, ctr);

      this.toMaster();
      this._triggered = {};
    }
    Tone.extend(Instrument, Tone.PolySynth);

    var instruments = [];

    r.getInstruments = function() {
      return instruments;
    };

    r.addInstrument = function(type, options) {
      instr = new Instrument(type, options);

      if (instr === null || instr === undefined) {
        return;
      }

      instruments.push(instr);
    };

    function inToIndex(instrOrIndex) {
      var index;
      if (typeof instrOrIndex === "object") {
        index = instruments.indexOf(instrOrIndex);
      } else {
        index = +index;
      }
      if (index >= instruments.length) {
        index = -1;
      }
      return index;
    }

    r.removeInstrument = function(instrOrIndex) {
      var index = inToIndex(instrOrIndex);
      if (index < 0) {
        return;
      }

      instruments.splice(index, 1);
    };

    r.moveInstrument = function(instrOrIndex, newIndex) {
      var index = inToIndex(instrOrIndex);
      if (index < 0) {
        return;
      }

      var ins = instruments.splice(index, 1);
      instruments.splice(newIndex, 0, ins);
    };

    r.swapInstruments = function(instrOrIndex1, instrOrIndex2) {
      var i1 = inToIndex(instrToIndex1);
      var i2 = inToIndex(instrToIndex2);
      if (i1 < 0 || i2 < 0) {
        return;
      }

      var tmp = instruments[i1];
      instruments[i1] = instruments[i2];
      instruments[i2] = tmp;
    };

    Tone.extend(Instrument, Tone.PolySynth);

    Instrument.prototype.triggerAttack = function(id, pitch, delay) {
      // Don't play out-of-range notes
      if (pitch < 0 || pitch > 127) {
        return;
      }
      var tA = Tone.PolySynth.prototype.triggerAttack;

      var freq = Rhombus.Util.noteNum2Freq(pitch);
      this._triggered[id] = freq;

      if (delay > 0) {
        tA.call(this, freq, "+" + delay);
      } else {
        tA.call(this, freq);
      }
    };

    Instrument.prototype.triggerRelease = function(id, delay) {
      var tR = Tone.PolySynth.prototype.triggerRelease;
      var freq = this._triggered[id];
      if (delay > 0) {
        tR.call(this, freq, "+" + delay);
      } else {
        tR.call(this, freq);
      }
    };

    Instrument.prototype.killAllNotes = function() {
      var freqs = [];
      for (var id in this._triggered) {
        freqs.push(this._triggered[id]);
      }
      Tone.PolySynth.prototype.triggerRelease.call(this, freqs);
      this._triggered = {};
    };

    // only one preview note is allowed at a time
    var previewNote = undefined;

    r.startPreviewNote = function(pitch) {
      if (instruments.length === 0) {
        return;
      }

      if (previewNote === undefined) {
        previewNote = new Note(pitch, 0);
        instruments[0].triggerAttack(previewNote._id, pitch, 0);
      }
    };

    r.stopPreviewNote = function() {
      if (instruments.length === 0) {
        return;
      }

      if (previewNote !== undefined) {
        instruments[0].triggerRelease(previewNote._id, 0);
        previewNote = undefined;
      }
    };
  };
})(this.Rhombus);
