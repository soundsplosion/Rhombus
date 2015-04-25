//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus._instMap = [
  [ "mono",  "PolySynth",   undefined        ],
  [ "samp",  "Drums",       "drums1"         ],
  [ "samp",  "808",         "drums2"         ],
  [ "samp",  "Flute",       "tron_flute"     ],
  [ "samp",  "Woodwinds",   "tron_woodwinds" ],
  [ "samp",  "Brass 01",    "tron_brass_01"  ],
  [ "samp",  "Guitar",      "tron_guitar"    ],
  [ "samp",  "Choir",       "tron_choir"     ],
  [ "samp",  "Cello",       "tron_cello"     ],
  [ "samp",  "Strings",     "tron_strings"   ],
  [ "samp",  "Violins",     "tron_violins"   ],
  [ "samp",  "Violins 02",  "tron_16vlns"    ],
  [ "am",    "AM Synth",    undefined        ],
  [ "fm",    "FM Synth",    undefined        ],
  [ "noise", "Noise Synth", undefined        ],
  [ "duo",   "Duo Synth",   undefined        ]
];

Rhombus.prototype.instrumentTypes = function() {
  var types = [];
  for (var i = 0; i < Rhombus._instMap.length; i++) {
    types.push(Rhombus._instMap[i][0]);
  }
  return types;
};

Rhombus.prototype.instrumentDisplayNames = function() {
  var names = [];
  for (var i = 0; i < Rhombus._instMap.length; i++) {
    names.push(Rhombus._instMap[i][1]);
  }
  return names;
};

Rhombus.prototype.sampleSets = function() {
  var sets = [];
  for (var i = 0; i < Rhombus._instMap.length; i++) {
    sets.push(Rhombus._instMap[i][2]);
  }
  return sets;
};

Rhombus.prototype.addInstrument = function(type, json, idx, sampleSet) {
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
    this._toMaster(instr);
  }

  if (isDefined(gi)) {
    Rhombus.Util.numberifyInputs(gi);
    instr._graphInputs = gi;
  }

  var idToRemove = instr._id;
  var that = this;
  this.Undo._addUndoAction(function() {
    that.removeInstrument(idToRemove, true);
  });
  this._song._instruments.addObj(instr, idx);

  instr._graphType = "instrument";

  return instr._id;
};

Rhombus.prototype.removeInstrument = function(instrOrId, internal) {
  function inToId(instrOrId) {
    var id;
    if (typeof instrOrId === "object") {
      id = instrOrId._id;
    } else {
      id = +instrOrId;
    }
    return id;
  }

  var id = inToId(instrOrId);
  if (id < 0) {
    return;
  }

  // exercise the nuclear option
  this.killAllNotes();

  var instr = this._song._instruments.getObjById(id);
  var slot = this._song._instruments.getSlotById(id);

  var go = Rhombus.Util.deepCopy(instr.graphOutputs());
  var gi = Rhombus.Util.deepCopy(instr.graphInputs());

  if (!internal) {
    var that = this;
    this.Undo._addUndoAction(function() {
      that._song._instruments.addObj(instr, slot);
      instr._restoreConnections(go, gi);
    });
  }

  instr._removeConnections();
  this._song._instruments.removeId(id);
};

Rhombus.prototype._initPreviewNotes = function() {
  if (notDefined(this._previewNotes)) {
    this._previewNotes = [];
  }
};

Rhombus.prototype._isTargetTrackDefined = function(rhomb) {
  var targetId  = this._globalTarget;
  var targetTrk = this._song._tracks.getObjBySlot(targetId);

  if (notDefined(targetTrk)) {
    console.log("[Rhombus] - target track is not defined");
    return false;
  } else {
    return true;
  }
};

Rhombus.prototype.startPreviewNote = function(pitch, velocity) {
  if (notDefined(pitch) || !isInteger(pitch) || pitch < 0 || pitch > 127) {
    console.log("[Rhombus] - invalid preview note pitch");
    return;
  }

  this._initPreviewNotes();
  var targetId  = this._globalTarget;
  var targetTrk = this._song._tracks.getObjBySlot(targetId);

  if (!this._isTargetTrackDefined(this)) {
    return;
  }

  if (notDefined(velocity) || velocity < 0 || velocity > 1) {
    velocity = 0.5;
  }

  var rtNote = new Rhombus.RtNote(pitch,
                               velocity,
                               Math.round(this.getPosTicks()),
                               0,
                               targetId,
                               r);

  this._previewNotes.push(rtNote);

  var targets = this._song._tracks.getObjBySlot(targetId)._targets;
  for (var i = 0; i < targets.length; i++) {
    var inst = this._song._instruments.getObjById(targets[i]);
    if (isDefined(inst)) {
      inst.triggerAttack(rtNote._id, pitch, 0, velocity);
    }
  }

  if (!this.isPlaying() && this.getRecordEnabled()) {
    this.startPlayback();
    document.dispatchEvent(new CustomEvent("rhombus-start"));
  }
};

Rhombus.prototype.stopPreviewNote = function(pitch) {
  if (!this._isTargetTrackDefined(this)) {
    return;
  }

  this._initPreviewNotes();
  var curTicks = Math.round(this.getPosTicks());

  var deadNoteIds = [];

  // Kill all preview notes with the same pitch as the input pitch, since
  // there is no way to distinguish between them
  //
  // If record is enabled, add the finished notes to the record buffer
  for (var i = this._previewNotes.length - 1; i >=0; i--) {
    var rtNote = this._previewNotes[i];
    if (rtNote._pitch === pitch) {
      deadNoteIds.push(rtNote._id);

      // handle wrap-around notes by clamping at the loop end
      if (curTicks < rtNote._start) {
        rtNote._end = this.getLoopEnd();
      }
      else {
        rtNote._end = curTicks;
      }

      // enforce a minimum length of 15 ticks
      if (rtNote._end - rtNote._start < 15) {
        rtNote._end = rtNote._start + 15;
      }

      if (this.isPlaying() && this.getRecordEnabled()) {
        this.Record.addToBuffer(rtNote);
      }

      this._previewNotes.splice(i, 1);
    }
  }

  var targets = this._song._tracks.getObjBySlot(this._globalTarget)._targets;
  killRtNotes(deadNoteIds, targets);
};

// Maintain an array of the currently sounding preview notes
Rhombus.prototype.killAllPreviewNotes = function() {
  function killRtNotes(noteIds, targets) {
    for (var i = 0; i < targets.length; i++) {
      var inst = this._song._instruments.getObjById(targets[i]);
      if (isDefined(inst)) {
        for (var j = 0; j < noteIds.length; j++) {
          inst.triggerRelease(noteIds[j], 0);
        }
      }
    }
  };

  if (!this._isTargetTrackDefined(this)) {
    return;
  }

  this._initPreviewNotes();

  var deadNoteIds = [];
  while (this._previewNotes.length > 0) {
    var rtNote = this._previewNotes.pop();
    deadNoteIds.push(rtNote._id);
  }

  var targets = this._song._tracks.getObjBySlot(this._globalTarget)._targets;
  killRtNotes(deadNoteIds, targets);

  console.log("[Rhombus] - killed all preview notes");
};
