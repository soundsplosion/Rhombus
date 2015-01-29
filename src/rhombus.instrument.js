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

      r._newId(this);

      this._ctr = ctr;
      Tone.PolySynth.call(this, null, ctr);

      this.toMaster();
      this._triggered = {};
    }
    Tone.extend(Instrument, Tone.PolySynth);

    var instruments = {};

    r.getInstruments = function() {
      return instruments;
    };

    r.addInstrument = function(type, options) {
      instr = new Instrument(type, options);

      if (instr === null || instr === undefined) {
        return;
      }

      instruments[instr._id] = instr;
    };

    function inToId(instrOrId) {
      var id;
      if (typeof instrOrId === "object") {
        id = instrOrId._id;
      } else {
        id = +id;
      }
      return index;
    }

    r.removeInstrument = function(instrOrId) {
      var id = inToId(instrOrId);
      if (id < 0) {
        return;
      }

      delete instruments[id];
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
      var keys = Object.keys(instruments);
      if (keys.length === 0) {
        return;
      }

      if (previewNote === undefined) {
        previewNote = new Note(pitch, 0);
        instruments[keys[0]].triggerAttack(previewNote._id, pitch, 0);
      }
    };

    r.stopPreviewNote = function() {
      var keys = Object.keys(instruments);
      if (keys.length === 0) {
        return;
      }

      if (previewNote !== undefined) {
        instruments[keys[0]].triggerRelease(previewNote._id, 0);
        previewNote = undefined;
      }
    };
  };
})(this.Rhombus);
