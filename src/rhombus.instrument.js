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

      var instr = r._song._instruments.getObjById(id);
      var slot = r._song._instruments.getSlotById(id);
      var gc = instr.graphChildren();
      var gp = instr.graphParents();

      r.Undo._addUndoAction(function() {
        r._song._instruments.addObj(instr, slot);
        instr.restoreConnections(gc, gp);
      });
      instr._removeConnections();
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

    // Maintain an array of the currently sounding preview notes
    var previewNotes = new Array();

    r.startPreviewNote = function(pitch, velocity) {
      var targetId = getInstIdByIndex(this._globalTarget);

      if (notDefined(velocity) || velocity < 0 || velocity > 1) {
        velocity = 0.5;
      }

      var rtNote = new this.RtNote(pitch,
                                   velocity,
                                   Math.round(this.getPosTicks()),
                                   0,
                                   targetId);

      previewNotes.push(rtNote);

      var inst = this._song._instruments.getObjById(targetId);
      if (isDefined(inst)) {
        inst.triggerAttack(rtNote._id, pitch, 0, velocity);
      }
    };

    r.stopPreviewNote = function(pitch) {
      var curTicks = Math.round(this.getPosTicks());

      // Kill all preview notes with the same pitch as the input pitch, since
      // there is no way to distinguish between them
      //
      // If record is enabled, add the finished notes to the record buffer
      for (var i = previewNotes.length - 1; i >=0; i--) {
        var rtNote = previewNotes[i];
        if (rtNote._pitch === pitch) {
          var inst = this._song._instruments.getObjById(rtNote._target);

          if (isDefined(inst)) {
            inst.triggerRelease(rtNote._id, 0);
          }

          // handle wrap-around notes by clamping at the loop end
          if (curTicks < rtNote._start) {
            rtNote._end = r.getLoopEnd();
          }
          else {
            rtNote._end = curTicks;
          }

          // enforce a minimum length of 5 ticks
          if (rtNote._end - rtNote._start < 5) {
            rtNote._end = rtNote._start + 5;
          }

          if (this.isPlaying() && this.getRecordEnabled()) {
            this.Record.addToBuffer(rtNote);
          }

          previewNotes.splice(i, 1);
        }
      }
    };

    r.killAllPreviewNotes = function() {
      while (previewNotes.length > 0) {
        var rtNote = previewNotes.pop();
        var inst = this._song._instruments.getObjById(rtNote._target);

        // TODO: this check will need to change when full track->instrument
        // routing is implemented
        if (notDefined(inst)) {
          continue;
        }

        inst.triggerRelease(rtNote._id, 0);
      }

      console.log("[Rhombus] - killed all preview notes");
    };
  };
})(this.Rhombus);
