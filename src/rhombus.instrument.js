//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

    r.addInstrument = function(type, options, gc, gp, id, idx) {
      var instr;
      if (type === "samp") {
        instr = new this._Sampler(options, id);
      } else {
        instr = new this._ToneInstrument(type, options, id);
      }

      if (isNull(instr) || notDefined(instr)) {
        return;
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

      var idToRemove = instr._id;
      r.Undo._addUndoAction(function() {
        r.removeInstrument(idToRemove);
      });
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

      var oldSlot = r._song._instruments.getSlotById(id);
      var oldInstr = r._song._instruments.getObjById(id);
      r.Undo._addUndoAction(function() {
        r._song._instruments.addObj(oldInstr, oldSlot);
      });

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
