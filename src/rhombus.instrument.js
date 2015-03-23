//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

    r._addInstrumentFunctions = function(ctr) {
      ctr.prototype._trackParams = trackParams;
      ctr.prototype.parameterCount = parameterCount;
      ctr.prototype.parameterName = parameterName;
      ctr.prototype.parameterDisplayString = parameterDisplayString;
      ctr.prototype.parameterDisplayStringByName = parameterDisplayStringByName;
      ctr.prototype.normalizedGet = normalizedGet;
      ctr.prototype.normalizedGetByName = normalizedGetByName;
      ctr.prototype.normalizedSet = normalizedSet;
      ctr.prototype.normalizedSetByName = normalizedSetByName;
    };

    function trackParams(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    }

    function parameterCount() {
      return Rhombus._map.subtreeCount(this._unnormalizeMap);
    }

    function parameterName(paramIdx) {
      var name = Rhombus._map.getParameterName(this._unnormalizeMap, paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    }

    function parameterDisplayString(paramIdx) {
      return this.parameterDisplayStringByName(this.parameterName(paramIdx));
    }

    function parameterDisplayStringByName(paramName) {
      var pieces = paramName.split(":");

      var curValue = this._currentParams;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var setObj = Rhombus._map.generateSetObjectByName(this._unnormalizeMap, paramName, curValue);
      var realObj = Rhombus._map.unnormalizedParams(setObj, this._unnormalizeMap);

      curValue = realObj;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var displayValue = curValue;
      var disp = Rhombus._map.getDisplayFunctionByName(this._unnormalizeMap, paramName);
      return disp(displayValue);
    }

    function normalizedGet(paramIdx) {
      return Rhombus._map.getParameterValue(this._currentParams, paramIdx);
    }

    function normalizedGetByName(paramName) {
      return Rhombus._map.getParameterValueByName(this._currentParams, paramName);
    }

    function normalizedSet(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(this._unnormalizeMap, paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    }

    function normalizedSetByName(paramName, paramValue) {
      var setObj = Rhombus._map.generateSetObjectByName(this._unnormalizeMap, paramName, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    }

    r.addInstrument = function(type, options, gc, gp, id, idx) {
      var instr;
      if (type === "samp") {
        instr = new this._Sampler(options, id);
      } else {
        instr = new this._ToneInstrument(type, options, id);
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
