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
      var options, go, gi, id, graphX, graphY;
      if (isDefined(json)) {
        options = json._params;
        go = json._graphOutputs;
        gi = json._graphInputs;
        id = json._id;
        graphX = json._graphX;
        graphY = json._graphY;
      }

      var instr;
      if (type === "samp") {
        instr = new this._Sampler(options, id);
      } else {
        instr = new this._ToneInstrument(type, options, id);
      }

      // TODO: get these slots right
      instr._graphSetup(0, 1, 1, 0);
      if (isNull(instr) || notDefined(instr)) {
        return;
      }

      instr.setGraphX(graphX);
      instr.setGraphY(graphY);

      if (isDefined(go)) {
        Rhombus.Util.numberifyOutputs(go);
        instr._graphOutputs = go;
      } else {
        r._toMaster(instr);
      }

      if (isDefined(gi)) {
        Rhombus.Util.numberifyInputs(gi);
        instr._graphInputs = gi;
      }

      var idToRemove = instr._id;
      r.Undo._addUndoAction(function() {
        r.removeInstrument(idToRemove, true);
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

    r.removeInstrument = function(instrOrId, internal) {
      var id = inToId(instrOrId);
      if (id < 0) {
        return;
      }

      var instr = r._song._instruments.getObjById(id);
      var slot = r._song._instruments.getSlotById(id);
      var go = instr.graphOutputs();
      var gi = instr.graphInputs();

      if (!internal) {
        r.Undo._addUndoAction(function() {
          r._song._instruments.addObj(instr, slot);
          instr._restoreConnections(go, gi);
        });
      }

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
          for (var targetIdx = 0; targetIdx < rtNote._targets.length; targetIdx++) {
            var inst = this._song._instruments.getObjById(rtNote._targets[targetIdx]);
            if (notDefined(inst)) {
              continue;
            }
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
        for (var targetIdx = 0; targetIdx < rtNote._targets.length; targetIdx++) {
          var inst = this._song._instruments.getObjById(rtNote._targets[targetIdx]);

          if (notDefined(inst)) {
            continue;
          }

          inst.triggerRelease(rtNote._id, 0);
        }
      }

      console.log("[Rhombus] - killed all preview notes");
    };
  };
})(this.Rhombus);
