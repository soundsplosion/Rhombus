//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

/**
 * A class that represents a song loaded into the Rhombus engine.
 * Don't create one yourself.
 * @constructor
 */
Rhombus.Song = function(r) {
  this._r = r;

  // song metadata
  this._title  = "Default Song Title";
  this._artist = "Default Song Artist";
  this._length = 30720;
  this._bpm    = 120;

  this._loopStart = 0;
  this._loopEnd   = 1920;

  // song structure data
  if (isNumber(this._r._constraints.max_tracks)) {
    var maxTracks = Math.max(1, this._r._constraints.max_tracks);
    this._tracks = new Rhombus.Util.IdSlotContainer(maxTracks);
  } else {
    // 32 tracks, I guess.
    this._tracks = new Rhombus.Util.IdSlotContainer(32);
  }

  this._patterns = {};

  if (isNumber(this._r._constraints.max_instruments)) {
    var maxInstruments = Math.max(1, this._r._constraints.max_instruments);
    this._instruments = new Rhombus.Util.IdSlotContainer(maxInstruments);
  } else {
    // Once again, I guess 32.
    this._instruments = new Rhombus.Util.IdSlotContainer(32);
  }

  this._effects = {};
  this._soloList = [];

  this._curId = 0;

  // Tracks number of notes for constraint enforcement.
  this._noteCount = 0;
};

Rhombus.Song.prototype.getTitle = function() {
  return this._title;
};

Rhombus.Song.prototype.setTitle = function(title) {
  this._title = title;
};

Rhombus.Song.prototype.getArtist = function() {
  return this._artist;
}

Rhombus.Song.prototype.setArtist = function(artist) {
  this._artist = artist;
};

Rhombus.Song.prototype.setLength = function(length) {
  if (isDefined(length) && length >= 480) {
    this._length = length;
    return length;
  }
  else {
    return undefined;
  }
};

Rhombus.Song.prototype.getLength = function() {
  return this._length;
};

Rhombus.Song.prototype.getPatterns = function() {
  return this._patterns;
};

Rhombus.Song.prototype.addPattern = function(pattern) {
  if (notDefined(pattern)) {
    var pattern = new this._r.Pattern();
  }
  this._patterns[pattern._id] = pattern;

  var that = this;
  this._r.Undo._addUndoAction(function() {
    delete that._patterns[pattern._id];
  });

  return pattern._id;
};

Rhombus.Song.prototype.deletePattern = function(ptnId) {
  console.log("[Rhombus] - deleting ptnId " + ptnId);
  var pattern = this._patterns[ptnId];

  if (notDefined(pattern)) {
    return undefined;
  }

  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._patterns[ptnId] = pattern;
  });

  // TODO: make this action undoable
  // remove all instances of the deleted pattern from track playlists
  var tracks = this._tracks;
  tracks.objIds().forEach(function(trkId) {
    var track = tracks.getObjById(trkId);
    for (var itemId in track._playlist) {
      var item = track._playlist[itemId];
      if (+item._ptnId == +ptnId) {
        track.removeFromPlaylist(itemId);
      }
    }
  });

  delete this._patterns[ptnId];
  return ptnId;
};

Rhombus.Song.prototype.addTrack = function() {
  // Create a new Track object
  var track = new this._r.Track();
  this._tracks.addObj(track);

  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._tracks.removeObj(track);
  });

  // Return the ID of the new Track
  return track._id;
};

Rhombus.Song.prototype.deleteTrack = function(trkId) {
  trkId = +trkId;
  var track = this._tracks.getObjById(trkId);

  if (notDefined(track)) {
    return undefined;
  }

  track.killAllNotes();
  this._r.killAllPreviewNotes();

  // Remove the track from the solo list, if it's soloed
  var index = this._soloList.indexOf(track._id);
  if (index > -1) {
    this._soloList.splice(index, 1);
  }

  var slot = this._tracks.getSlotById(trkId);
  var track = this._tracks.removeId(trkId);

  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._tracks.addObj(track, slot);
  });

  track._removeConnections();

  return trkId;
};

Rhombus.Song.prototype.getTracks = function() {
  return this._tracks;
};

Rhombus.Song.prototype.getInstruments = function() {
  return this._instruments;
};

Rhombus.Song.prototype.getEffects = function() {
  return this._effects;
};

// Song length here is defined as the end of the last
// playlist item on any track
Rhombus.Song.prototype.findSongLength = function() {
  var length = 0;

  var tracks = this._tracks;
  tracks.objIds().forEach(function(trkId) {
    var track = tracks.getObjById(trkId);

    for (var itemId in track._playlist) {
      var item = track._playlist[itemId];
      var itemEnd = item._start + item._length;

      if (itemEnd > length) {
        length = itemEnd;
      }
    }
  });

  return length;
};

Rhombus.prototype.getSongLengthSeconds = function() {
  return this.ticks2Seconds(this._song._length);
};

Rhombus.prototype.initSong = function() {
  this._song = new Rhombus.Song(this);
  // Add the master effect
  this.addEffect("mast");
};

Rhombus.prototype.importSong = function(json) {
  this._song = new Rhombus.Song(this);
  var parsed = JSON.parse(json);
  this._song.setTitle(parsed._title);
  this._song.setArtist(parsed._artist);
  this._song._length = parsed._length || 30720;
  this._song._bpm = parsed._bpm || 120;

  this._song._loopStart = parsed._loopStart || 0;
  this._song._loopEnd = parsed._loopEnd || 1920;

  var tracks      = parsed._tracks;
  var patterns    = parsed._patterns;
  var instruments = parsed._instruments;
  var effects     = parsed._effects;

  for (var ptnId in patterns) {
    var pattern = patterns[ptnId];
    var noteMap = pattern._noteMap;

    var newPattern = new this.Pattern(+ptnId);

    newPattern._name = pattern._name;
    newPattern._length = pattern._length;

    if (isDefined(pattern._color)) {
      newPattern.setColor(pattern._color);
    }

    for (var noteId in noteMap) {
      var note = new this.Note(+noteMap[noteId]._pitch,
                               +noteMap[noteId]._start,
                               +noteMap[noteId]._length,
                               +noteMap[noteId]._velocity || 1,
                               +noteId);

      newPattern.addNote(note);
    }

    this._song._patterns[+ptnId] = newPattern;
  }

  for (var trkIdIdx in tracks._slots) {
    var trkId = +tracks._slots[trkIdIdx];
    var track = tracks._map[trkId];
    var playlist = track._playlist;

    // Create a new track and manually set its ID
    var newTrack = new this.Track(trkId);

    newTrack._name = track._name;

    var go = track._graphOutputs;
    var gi = track._graphInputs;
    if (isDefined(go)) {
      Rhombus.Util.numberifyOutputs(go);
      newTrack._graphOutputs = go;
    }
    if (isDefined(gi)) {
      Rhombus.Util.numberifyInputs(gi);
      newTrack._graphInputs = gi;
    }

    for (var itemId in playlist) {
      var item = playlist[itemId];
      var parentId = trkId;

      var newItem = new this.PlaylistItem(parentId,
                                          item._ptnId,
                                          item._start,
                                          item._length,
                                          item._id);

      newTrack._playlist[+itemId] = newItem;
    }

    this._song._tracks.addObj(newTrack, trkIdIdx);
  }

  for (var instIdIdx in instruments._slots) {
    var instId = instruments._slots[instIdIdx];
    var inst = instruments._map[instId];
    console.log("[Rhomb.importSong] - adding instrument of type " + inst._type);
    if (isDefined(inst._sampleSet)) {
      console.log("[Rhomb.importSong] - sample set is: " + inst._sampleSet);
    }
    this.addInstrument(inst._type, inst, +instIdIdx, inst._sampleSet);
  }

  for (var effId in effects) {
    var eff = effects[effId];
    this.addEffect(eff._type, eff);
  }

  this._importFixGraph();

  // restore curId -- this should be the last step of importing
  var curId;
  if (notDefined(parsed._curId)) {
    console.log("[Rhombus Import] curId not found -- beware");
  }
  else {
    this.setCurId(parsed._curId);
  }

  // Undo actions generated by the import or from
  // before the song import should not be used.
  this.Undo._clearUndoStack();
};

Rhombus.prototype.setSampleResolver = function(resolver) {
  this._sampleResolver = resolver;
};

Rhombus.prototype.exportSong = function() {
  this._song._curId = this.getCurId();
  return JSON.stringify(this._song);
};

Rhombus.prototype.getSong = function() {
  return this._song;
};
