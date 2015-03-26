//! rhombus.instrument.tone.js
//! authors: Spencer Phippen, Tim Grant
//!
//! Contains instrument definitions for instruments wrapped from Tone.
//!
//! license: MIT

(function(Rhombus) {
  Rhombus._wrappedInstrumentSetup = function(r) {

    var mono = Tone.MonoSynth;
    var am = Tone.AMSynth;
    var fm = Tone.FMSynth;
    var noise = Tone.NoiseSynth;
    var duo = Tone.DuoSynth;
    var typeMap = {
      "mono" : mono,
      "am"   : am,
      "fm"   : fm,
      "noise": noise,
      "duo"  : duo
    };

    function ToneInstrument(type, options, id) {
      var ctr = typeMap[type];
      if (isNull(ctr) || notDefined(ctr)) {
        type = "mono";
        ctr = mono;
      }

      if (notDefined(id)) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      this._type = type;
      this._unnormalizeMap = unnormalizeMaps[this._type];
      this._currentParams = {};
      this._triggered = {};

      Tone.PolySynth.call(this, undefined, ctr);
      var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps[this._type]);
      this._normalizedObjectSet(def, true);
      this._normalizedObjectSet(options, true);
    }

    Tone.extend(ToneInstrument, Tone.PolySynth);
    r._addGraphFunctions(ToneInstrument);
    r._addParamFunctions(ToneInstrument);

    ToneInstrument.prototype.triggerAttack = function(id, pitch, delay, velocity) {
      // Don't play out-of-range notes
      if (pitch < 0 || pitch > 127) {
        return;
      }
      var tA = Tone.PolySynth.prototype.triggerAttack;

      var freq = Rhombus.Util.noteNum2Freq(pitch);
      this._triggered[id] = freq;

      velocity = (+velocity >= 0.0 && +velocity <= 1.0) ? +velocity : 0.5;

      if (delay > 0) {
        tA.call(this, freq, "+" + delay, velocity);
      } else {
        tA.call(this, freq, "+" + 0, velocity);
      }
    };

    ToneInstrument.prototype.triggerRelease = function(id, delay) {
      var tR = Tone.PolySynth.prototype.triggerRelease;
      var freq = this._triggered[id];
      if (delay > 0) {
        tR.call(this, freq, "+" + delay);
      } else {
        tR.call(this, freq);
      }
      delete this._triggered[id];
    };

    ToneInstrument.prototype.killAllNotes = function() {
      var freqs = [];
      for (var id in this._triggered) {
        freqs.push(this._triggered[id]);
      }
      Tone.PolySynth.prototype.triggerRelease.call(this, freqs);
      this._triggered = {};
    };

    ToneInstrument.prototype.toJSON = function() {
      var gc, gp;
      if (isDefined(this._graphChildren)) {
        gc = this._graphChildren;
      } else {
        gc = [];
      }

      if (isDefined(this._graphParents)) {
        gp = this._graphParents;
      } else {
        gp = [];
      }

      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams,
        "_graphChildren": gc,
        "_graphParents": gp
      };
      return jsonVersion;
    };

    ////////////////////////////////////////////////////////////////////////////////
    // BEGIN ULTRAHAX
    ////////////////////////////////////////////////////////////////////////////////

    // ["Display Name", scale, isVisible, isDiscrete, isBipolar, offset]

    var paramMap = [
      ["Portamento",       1, false, false, false, 0.0],  // 00
      ["Volume",           4, true,  false, false, 0.0],  // 01
      ["Osc Type",         5, true,  true,  false, 0.0],  // 02
      ["Amp Attack",       1, true,  false, false, 0.0],  // 03
      ["Amp Decay",        1, true,  false, false, 0.0],  // 04
      ["Amp Sustain",      1, true,  false, false, 0.0],  // 05
      ["Amp Release",      1, true,  false, false, 0.0],  // 06
      ["Amp Exp",          1, false, false, false, 0.0],  // 07
      ["Filter Type",      1, false, false, false, 0.0],  // 08
      ["Filter Cutoff",    1, true,  false, false, 0.0],  // 09
      ["Filter Rolloff",   1, false, false, false, 0.0],  // 10
      ["Filter Resonance", 1, true,  false, false, 0.0],  // 11
      ["Filter Gain",      1, false, false, false, 0.0],  // 12
      ["Filter Attack",    1, true,  false, false, 0.0],  // 13
      ["Filter Decay",     1, true,  false, false, 0.0],  // 14
      ["Filter Sustain",   1, true,  false, false, 0.0],  // 15
      ["Filter Release",   1, true,  false, false, 0.0],  // 16
      ["Filter Min",       1, false, false, false, 0.0],  // 17
      ["Filter Mod",       2, true,  false, false, 0.5],  // 18
      ["Filter Exp",       1, false, false, false, 0.0],  // 19
      ["Osc Detune",      10, true,  false, true,  0.0]   // 20
    ];

    ToneInstrument.prototype.getParamMap = function() {
      var map = {};
      for (var i = 0; i < paramMap.length; i++) {
        var param = {
          "name"     : paramMap[i][0],
          "index"    : i,
          "scale"    : paramMap[i][1],
          "visible"  : paramMap[i][2],
          "discrete" : paramMap[i][3],
          "bipolar"  : paramMap[i][4],
          "offset"   : paramMap[i][5]
        };
        map[paramMap[i][0]] = param;
      }

      return map;
    };

    ToneInstrument.prototype.getControls = function (controlHandler) {
      var controls = new Array();
      for (var i = 0; i < paramMap.length; i++) {
        controls.push( { id       : paramMap[i][0],
                         target   : this._id,
                         on       : "input",
                         callback : controlHandler,
                         scale    : paramMap[i][1],
                         discrete : paramMap[i][3],
                         bipolar  : paramMap[i][4] } );
      }

      return controls;
    };

    ToneInstrument.prototype.getInterface = function() {

      // create a container for the controls
      var div = document.createElement("div");

      // create controls for each of the parameters in the map
      for (var i = 0; i < paramMap.length; i++) {
        var param = paramMap[i];

        // don't draw invisible controls
        if (!param[2]) {
          continue;
        }

        // paramter range and value stuff
        var value = this.normalizedGet(i) * param[1];
        var min = 0;
        var max = 1;
        var step = 0.01;

        // bi-polar controls
        if (param[4]) {
          min = -1;
          max = 1;
          step = (max - min) / 100;
          value = (this.normalizedGet(i) - 0.5) * param[1];
        }

        // discrete controls
        if (param[3]) {
          min = 0;
          max = param[1];
          step = 1;
        }

        //var form = document.createElement("form");
        //form.setAttribute("oninput", param[0] +"Val.value=" + param[0] + ".value");

        // control label
        div.appendChild(document.createTextNode(param[0]));

        var ctrl = document.createElement("input");
        ctrl.setAttribute("id",     param[0]);
        ctrl.setAttribute("name",   param[0]);
        ctrl.setAttribute("class",  "newSlider");
        ctrl.setAttribute("type",   "range");
        ctrl.setAttribute("min",    min);
        ctrl.setAttribute("max",    max);
        ctrl.setAttribute("step",   step);
        ctrl.setAttribute("value",  value);

        //var output = document.createElement("output");
        //output.setAttribute("id",    param[0] + "Val");
        //output.setAttribute("name",  param[0] + "Val");
        //output.setAttribute("value", value);

        //form.appendChild(output);
        //form.appendChild(ctrl);
        //div.appendChild(form);

        div.appendChild(ctrl);
        div.appendChild(document.createElement("br"));
      }

      return div;
    };

    ////////////////////////////////////////////////////////////////////////////////
    // END ULTRAHAX
    ////////////////////////////////////////////////////////////////////////////////

    var secondsDisplay = Rhombus._map.secondsDisplay;
    var dbDisplay = Rhombus._map.dbDisplay;
    var rawDisplay = Rhombus._map.rawDisplay;
    var hzDisplay = Rhombus._map.hzDisplay;

    var monoSynthMap = {
      "portamento" : [Rhombus._map.mapLinear(0, 10), secondsDisplay, 0],
      "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
      "oscillator" : {
        "type" : [Rhombus._map.mapDiscrete("square", "sawtooth", "triangle", "sine", "pulse", "pwm"), rawDisplay, 0.0],
      },
      "envelope" : Rhombus._map.envelopeMap,
      "filter" : Rhombus._map.filterMap,
      "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
      "detune" : [Rhombus._map.harmMapFn, rawDisplay, 0.5]
    };

    var unnormalizeMaps = {
      "mono" : monoSynthMap,

      "am" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), secondsDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        // TODO: verify this is good
        "harmonicity" : [Rhombus._map.harmMapFn, rawDisplay, 0.5],
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "fm" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), secondsDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        // TODO: verify this is good
        "harmonicity" : [Rhombus._map.harmMapFn, rawDisplay, 0.5],
        // TODO: verify this is good
        "modulationIndex" : [Rhombus._map.mapLinear(-5, 5), rawDisplay, 0.5],
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "noise" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), rawDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        "noise" : {
          "type" : [Rhombus._map.mapDiscrete("white", "pink", "brown"), rawDisplay, 0.0]
        },
        "envelope" : Rhombus._map.envelopeMap,
        "filter" : Rhombus._map.filterMap,
        "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
      },

      "duo" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), rawDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        "vibratoAmount" : [Rhombus._map.mapLinear(0, 20), rawDisplay, 0.025],
        "vibratoRate" : [Rhombus._map.freqMapFn, hzDisplay, 0.1],
        "vibratoDelay" : [Rhombus._map.timeMapFn, secondsDisplay, 0.1],
        "harmonicity" : [Rhombus._map.harmMapFn, rawDisplay, 0.5],
        "voice0" : monoSynthMap,
        "voice1" : monoSynthMap
      }
    };

    ToneInstrument.prototype._normalizedObjectSet = function(params, internal) {
      if (notObject(params)) {
        return;
      }

      if (!internal) {
        var rthis = this;
        var oldParams = this._currentParams;

        r.Undo._addUndoAction(function() {
          rthis._normalizedObjectSet(oldParams, true);
        });
      }
      this._trackParams(params);
      var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap);
      this.set(unnormalized);
    };

    r._ToneInstrument = ToneInstrument;
  };
})(this.Rhombus);
