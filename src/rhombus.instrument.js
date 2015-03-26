//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

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

    function Instrument(type, options, id) {
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
      this._currentParams = {};
      this._triggered = {};

      Tone.PolySynth.call(this, undefined, ctr);
      var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps[this._type]);
      this._normalizedObjectSet(def, true);
      this._normalizedObjectSet(options, true);
    }

    Tone.extend(Instrument, Tone.PolySynth);
    r._addGraphFunctions(Instrument);

    r.addInstrument = function(type, options, gc, gp, id, idx) {
      var instr;
      if (type === "samp") {
        instr = new this._Sampler(options, id);
      } else {
        instr = new Instrument(type, options, id);
      }

      if (isDefined(gc)) {
        for (var i = 0; i < gc.length; i++) {
          gc[i] = +(gc[i]);
        }
        instr._graphChildren = gc;
      } else {
        r._toMaster(instr);
      }

      if (isDefined(gp)) {
        for (var i = 0; i < gp.length; i++) {
          gp[i] = +(gp[i]);
        }
        instr._graphParents = gp;
      }

      if (isNull(instr) || notDefined(instr)) {
        return;
      }

      this._song._instruments.addObj(instr, idx);
      return instr._id;
    };

    function inToId(instrOrId) {
      var id;
      if (typeof instrOrId === "object") {
        id = instrOrId._id;
      } else {
        id = +instrOrId;
      }
      return id;
    }

    r.removeInstrument = function(instrOrId) {
      var id = inToId(instrOrId);
      if (id < 0) {
        return;
      }

      r._song._instruments.removeId(id);
    };

    Instrument.prototype.triggerAttack = function(id, pitch, delay, velocity) {
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

    Instrument.prototype.triggerRelease = function(id, delay) {
      var tR = Tone.PolySynth.prototype.triggerRelease;
      var freq = this._triggered[id];
      if (delay > 0) {
        tR.call(this, freq, "+" + delay);
      } else {
        tR.call(this, freq);
      }
      delete this._triggered[id];
    };

    Instrument.prototype.killAllNotes = function() {
      var freqs = [];
      for (var id in this._triggered) {
        freqs.push(this._triggered[id]);
      }
      Tone.PolySynth.prototype.triggerRelease.call(this, freqs);
      this._triggered = {};
    };

    Instrument.prototype._trackParams = function(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    };

    Instrument.prototype.toJSON = function() {
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
                       //Scale  Vis    Discrt BP          Index
    var paramMap = [
      ["portamento",       1,   false, false, false],  // 00
      ["volume",           4,   true,  false, false],  // 01
      ["osc_type",         5,   true,  true,  false],  // 02
      ["amp_attack",       1,   true,  false, false],  // 03
      ["amp_decay",        1,   true,  false, false],  // 04
      ["amp_sustain",      1,   true,  false, false],  // 05
      ["amp_release",      1,   true,  false, false],  // 06
      ["amp_exp",          1,   false, false, false],  // 07
      ["filter_type",      1,   false, false, false],  // 08
      ["filter_cutoff",    1,   true,  false, false],  // 09
      ["filter_rolloff",   1,   false, false, false],  // 10
      ["filter_resonance", 1,   true,  false, false],  // 11
      ["filter_gain",      1,   false, false, false],  // 12
      ["filter_attack",    1,   true,  false, false],  // 13
      ["filter_decay",     1,   true,  false, false],  // 14
      ["filter_sustain",   1,   true,  false, false],  // 15
      ["filter_release",   1,   true,  false, false],  // 16
      ["filter_min",       1,   false, false, false],  // 17
      ["filter_mod",       2,   true,  false, false],  // 18
      ["filter_exp",       1,   false, false, false],  // 19
      ["osc_detune",      10,   true,  false, true]    // 20
    ];

    Instrument.prototype.getParamMap = function() {
      var map = {};
      for (var i = 0; i < paramMap.length; i++) {
        var param = {
          "name"     : paramMap[i][0],
          "index"    : i,
          "scale"    : paramMap[i][1],
          "visible"  : paramMap[i][2],
          "discrete" : paramMap[i][3],
          "bipolar"  : paramMap[i][4]
        };
        map[paramMap[i][0]] = param;
      }

      return map;
    };

    Instrument.prototype.getControls = function (controlHandler) {
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

    Instrument.prototype.getInterface = function() {

      // create a container for the controls
      var div = document.createElement("div");

      // create controls for each of the parameters in the map
      for (var i = 0; i < paramMap.length; i++) {
        var param = paramMap[i];

        // don't draw invisible
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
          value = value - 0.5;
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

    function unnormalizedParams(params, type) {
      return Rhombus._map.unnormalizedParams(params, type, unnormalizeMaps);
    }

    Instrument.prototype._normalizedObjectSet = function(params, internal) {
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
      var unnormalized = unnormalizedParams(params, this._type);
      this.set(unnormalized);
    };

    // Parameter list interface
    Instrument.prototype.parameterCount = function() {
      return Rhombus._map.subtreeCount(unnormalizeMaps[this._type]);
    };

    Instrument.prototype.parameterName = function(paramIdx) {
      var name = Rhombus._map.getParameterName(unnormalizeMaps[this._type], paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    };

    // Parameter display string stuff
    Instrument.prototype.parameterDisplayString = function(paramIdx) {
      return this.parameterDisplayStringByName(this.parameterName(paramIdx));
    };

    Instrument.prototype.parameterDisplayStringByName = function(paramName) {
      var pieces = paramName.split(":");

      var curValue = this._currentParams;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var setObj = Rhombus._map.generateSetObjectByName(unnormalizeMaps[this._type], paramName, curValue);
      var realObj = unnormalizedParams(setObj, this._type);

      curValue = realObj;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var displayValue = curValue;
      var disp = Rhombus._map.getDisplayFunctionByName(unnormalizeMaps[this._type], paramName);
      return disp(displayValue);
    };

    // Parameter getting/setting stuff
    Instrument.prototype.normalizedGet = function(paramIdx) {
      return Rhombus._map.getParameterValue(this._currentParams, paramIdx);
    };

    Instrument.prototype.normalizedGetByName = function(paramName) {
      return Rhombus._map.getParameterValueByName(this._currentParams, paramName);
    }

    Instrument.prototype.normalizedSet = function(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(unnormalizeMaps[this._type], paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    };

    Instrument.prototype.normalizedSetByName = function(paramName, paramValue) {
      var setObj = Rhombus._map.generateSetObjectByName(unnormalizeMaps[this._type], paramName, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    };

    function getInstIdByIndex(instrIdx) {
      return r._song._instruments.objIds()[instrIdx];
    }

    function getGlobalTarget() {
      var inst = r._song._instruments.getObjById(getInstIdByIndex(r._globalTarget));
      if (notDefined(inst)) {
        console.log("[Rhombus] - Trying to set parameter on undefined instrument -- dame dayo!");
        return undefined;
      }
      return inst;
    }

    r.getParameter = function(paramIdx) {
      var inst = getGlobalTarget();
      if (notDefined(inst)) {
        return undefined;
      }
      return inst.normalizedGet(paramIdx);
    };

    r.getParameterByName = function(paramName) {
      var inst = getGlobalTarget();
      if (notDefined(inst)) {
        return undefined;
      }
      return inst.normalizedGetByName(paramName);
    }

    r.setParameter = function(paramIdx, value) {
      var inst = getGlobalTarget();
      if (notDefined(inst)) {
        return undefined;
      }
      inst.normalizedSet(paramIdx, value);
      return value;
    };

    r.setParameterByName = function(paramName, value) {
      var inst = getGlobalTarget();
      if (notDefined(inst)) {
        return undefined;
      }
      inst.normalizedSetByName(paramName, value);
      return value;
    }

    // only one preview note is allowed at a time
    var previewNote = undefined;
    r.startPreviewNote = function(pitch, velocity) {
      var keys = this._song._instruments.objIds();
      if (keys.length === 0) {
        return;
      }

      if (notDefined(previewNote)) {
        var targetId = getInstIdByIndex(this._globalTarget);
        var inst = this._song._instruments.getObjById(targetId);
        if (notDefined(inst)) {
          console.log("[Rhombus] - Trying to trigger note on undefined instrument");
          return;
        }

        if (notDefined(velocity) || velocity < 0 || velocity > 1) {
          velocity = 0.5;
        }

        previewNote = new this.RtNote(pitch, 0, 0, targetId);
        inst.triggerAttack(previewNote._id, pitch, 0, velocity);
      }
    };

    r.stopPreviewNote = function() {
      var keys = this._song._instruments.objIds();
      if (keys.length === 0) {
        return;
      }

      if (isDefined(previewNote)) {
        var inst = this._song._instruments.getObjById(previewNote._target);
        if (notDefined(inst)) {
          console.log("[Rhombus] - Trying to release note on undefined instrument");
          return;
        }

        inst.triggerRelease(previewNote._id, 0);
        previewNote = undefined;
      }
    };
  };
})(this.Rhombus);
