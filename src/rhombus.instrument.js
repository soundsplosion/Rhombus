//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

    var instMap = [
      [ "samp",  "Drums",       "drums1"         ],
      [ "samp",  "Flute",       "tron_flute"     ],
      [ "samp",  "Woodwinds",   "tron_woodwinds" ],
      [ "samp",  "Brass 01",    "tron_brass_01"  ],
      [ "samp",  "Guitar",      "tron_guitar"    ],
      [ "samp",  "Choir",       "tron_choir"     ],
      [ "samp",  "Cello",       "tron_cello"     ],
      [ "samp",  "Strings",     "tron_strings"   ],
      [ "samp",  "Violins",     "tron_violins"   ],
      [ "samp",  "Violins 02",  "tron_16vlns"    ],
      [ "mono",  "PolySynth",   undefined        ],
      [ "am",    "AM Synth",    undefined        ],
      [ "fm",    "FM Synth",    undefined        ],
      [ "noise", "Noise Synth", undefined        ],
      [ "duo",   "Duo Synth",   undefined        ]
    ];

    r.instrumentTypes = function() {
      var types = [];
      for (var i = 0; i < instMap.length; i++) {
        types.push(instMap[i][0]);
      }
      return types;
    };

    r.instrumentDisplayNames = function() {
      var names = [];
      for (var i = 0; i < instMap.length; i++) {
        names.push(instMap[i][1]);
      }
      return names;
    };

    r.sampleSets = function() {
      var sets = [];
      for (var i = 0; i < instMap.length; i++) {
        sets.push(instMap[i][2]);
      }
      return sets;
    };

    r.addInstrument = function(type, json, idx, sampleSet) {
      var options, go, gi, id, graphX, graphY;
      if (isDefined(json)) {
        options = json._params;
        go = json._graphOutputs;
        gi = json._graphInputs;
        id = json._id;
        graphX = json._graphX;
        graphY = json._graphY;
      }

      function samplerOptionsFrom(options, set) {
        if (isDefined(options)) {
          options.sampleSet = set;
          return options;
        } else {
          return { sampleSet: set };
        }
      }

      var instr;

      // sampleSet determines the type of sampler....
      if (type === "samp") {
        if (notDefined(sampleSet)) {
          instr = new this._Sampler(samplerOptionsFrom(options, "drums1"), id);
        }
        else {
          instr = new this._Sampler(samplerOptionsFrom(options, sampleSet), id);
        }
      }
      else {
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

      instr._graphType = "instrument";

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

      // exercise the nuclear option
      r.killAllNotes();

      var instr = r._song._instruments.getObjById(id);
      var slot = r._song._instruments.getSlotById(id);

      var go = Rhombus.Util.deepCopy(instr.graphOutputs());
      var gi = Rhombus.Util.deepCopy(instr.graphInputs());

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

    isTargetTrackDefined = function(rhomb) {
      var targetId  = rhomb._globalTarget;
      var targetTrk = rhomb._song._tracks.getObjBySlot(targetId);

      if (notDefined(targetTrk)) {
        console.log("[Rhombus] - target track is not defined");
        return false;
      }
      else {
        return true;
      }
    };

    // Maintain an array of the currently sounding preview notes
    var previewNotes = new Array();

    r.startPreviewNote = function(pitch, velocity) {
      var targetId  = this._globalTarget;
      var targetTrk = this._song._tracks.getObjBySlot(targetId);

      if (!isTargetTrackDefined(this)) {
        return;
      }

      if (notDefined(velocity) || velocity < 0 || velocity > 1) {
        velocity = 0.5;
      }

      var rtNote = new this.RtNote(pitch,
                                   velocity,
                                   Math.round(this.getPosTicks()),
                                   0,
                                   targetId);

      previewNotes.push(rtNote);

      var targets = this._song._tracks.getObjBySlot(targetId)._targets;
      for (var i = 0; i < targets.length; i++) {
        var inst = this._song._instruments.getObjById(targets[i]);
        if (isDefined(inst)) {
          inst.triggerAttack(rtNote._id, pitch, 0, velocity);
        }
      }
    };

    killRtNotes = function(noteIds, targets) {
      for (var i = 0; i < targets.length; i++) {
        var inst = r._song._instruments.getObjById(targets[i]);
        if (isDefined(inst)) {
          for (var j = 0; j < noteIds.length; j++) {
            inst.triggerRelease(noteIds[j], 0);
          }
        }
      }
    };

    r.stopPreviewNote = function(pitch) {
      if (!isTargetTrackDefined(this)) {
        return;
      }

      var curTicks = Math.round(this.getPosTicks());

      var deadNoteIds = [];

      // Kill all preview notes with the same pitch as the input pitch, since
      // there is no way to distinguish between them
      //
      // If record is enabled, add the finished notes to the record buffer
      for (var i = previewNotes.length - 1; i >=0; i--) {
        var rtNote = previewNotes[i];
        if (rtNote._pitch === pitch) {
          deadNoteIds.push(rtNote._id);

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

      var targets = this._song._tracks.getObjBySlot(this._globalTarget)._targets;
      killRtNotes(deadNoteIds, targets);
    };

    r.killAllPreviewNotes = function() {
      if (!isTargetTrackDefined(this)) {
        return;
      }

      var deadNoteIds = [];
      while (previewNotes.length > 0) {
        var rtNote = previewNotes.pop();
        deadNoteIds.push(rtNote._id);
      }

      var targets = this._song._tracks.getObjBySlot(this._globalTarget)._targets;
      killRtNotes(deadNoteIds, targets);

      console.log("[Rhombus] - killed all preview notes");
    };
  };
})(this.Rhombus);
