//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

    r.instrumentTypes = function() {
      return ["samp", "mono", "am", "fm", "noise", "duo"];
    };

    r.instrumentDisplayNames = function() {
      return ["Sampler", "Monophonic Synth", "AM Synth", "FM Synth", "Noise Synth", "DuoSynth"];
    };

    r.addInstrument = function(type, json, idx) {
      var options, gc, gp, id;
      if (isDefined(json)) {
        options = json._params;
        gc = json._graphChildren;
        gp = json._graphParents;
        id = json._id;
      }

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

      instr.isInstrument = function() { return true; };
      instr.isEffect = function() { return false; };

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

    ////////////////////////////////////////////////////////////////////////////
    // Preview Note Stuff
    ////////////////////////////////////////////////////////////////////////////

    // TODO: find a more suitable place for this stuff

    // maintain an array of the currently sounding preview notes
    var previewNotes = new Array();
    r.startPreviewNote = function(pitch, velocity) {
      var keys = this._song._instruments.objIds();
      if (keys.length === 0) {
        return;
      }

      var targetId = getInstIdByIndex(this._globalTarget);
      var inst = this._song._instruments.getObjById(targetId);
      if (notDefined(inst)) {
        return;
      }

      if (notDefined(velocity) || velocity < 0 || velocity > 1) {
        velocity = 0.5;
      }

      console.log("[Rhombus] - starting preview note at tick " +
                  this.getCurrentPosTicks());

      var rtNote = new this.RtNote(pitch,
                                   velocity,
                                   this.getElapsedTime(),
                                   0,
                                   targetId,
                                   this.getElapsedTime());

      previewNotes.push(rtNote);
      inst.triggerAttack(rtNote._id, pitch, 0, velocity);
    };

    r.stopPreviewNote = function(pitch) {
      var keys = this._song._instruments.objIds();
      if (keys.length === 0) {
        return;
      }

      var curTime  = this.getElapsedTime();
      var curTicks = this.getCurrentPosTicks();

      for (var i = previewNotes.length - 1; i >=0; i--) {
        var rtNote = previewNotes[i];
        if (rtNote._pitch === pitch) {
          var inst = this._song._instruments.getObjById(rtNote._target);

          if (notDefined(inst)) {
            return;
          }

          inst.triggerRelease(rtNote._id, 0);
          previewNotes.splice(i, 1);

          var length = this.seconds2Ticks(curTime - rtNote._startTime);
          console.log("[Rhombus] - stopping preview note at tick " + curTicks +
                      ", length = " + length + " ticks");

          // TODO: buffer stopped preview notes for recording purposes
          if (this.isPlaying() && this.getRecordEnabled()) {
            this.Record.addToBuffer(rtNote._pitch,
                                    rtNote._velocity,
                                    rtNote._start,
                                    curTime);
          }
        }
      }
    };

    r.killAllPreviewNotes = function() {
      while (previewNotes.length > 0) {
        var rtNote = previewNotes.pop();
        var inst = this._song._instruments.getObjById(rtNote._target);

        if (notDefined(inst)) {
          return;
        }

        inst.triggerRelease(rtNote._id, 0);
      }

      console.log("[Rhombus] - killed all preview notes");
    };
  };
})(this.Rhombus);
