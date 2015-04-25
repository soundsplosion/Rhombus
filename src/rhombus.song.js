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

/**
 * @returns {String} The title of this song.
 */
Rhombus.Song.prototype.getTitle = function() {
  return this._title;
};

/**
 * @param {String} title The new title of this song.
 */
Rhombus.Song.prototype.setTitle = function(title) {
  this._title = title;
};

/**
 * @returns {String} The artist of this song.
 */
Rhombus.Song.prototype.getArtist = function() {
  return this._artist;
};

/**
 * @param {String} artist The new artist of this song.
 */
Rhombus.Song.prototype.setArtist = function(artist) {
  this._artist = artist;
};

/**
 * @returns {Number} The length of this Rhombus instance's current song, in ticks.
 */
Rhombus.Song.prototype.getLength = function() {
  return this._length;
};

/**
 * @param {Number} length The new length of the song, in ticks.
 */
Rhombus.Song.prototype.setLength = function(length) {
  if (isDefined(length) && length >= 480) {
    this._length = length;
    return length;
  }
  else {
    return undefined;
  }
};

/**
 * @returns {Object} A map from pattern ids to the {@link Rhombus.Pattern} objects in this song.
 */
Rhombus.Song.prototype.getPatterns = function() {
  return this._patterns;
};

/**
 * Adds the given pattern to this song.
 * @param {Rhombus.Pattern} pattern The pattern to add to this song.
 */
Rhombus.Song.prototype.addPattern = function(pattern) {
  if (notDefined(pattern)) {
    var pattern = new Rhombus.Pattern(this._r);
  }
  this._patterns[pattern._id] = pattern;

  var that = this;
  this._r.Undo._addUndoAction(function() {
    delete that._patterns[pattern._id];
  });

  return pattern._id;
};

/**
 * Removes the pattern with the given id from this song.
 * @param {Number} patternId The id of the pattern to delete.
 * @returns {Boolean} false if no pattern with the given ID existed, true otherwise.
 */
Rhombus.Song.prototype.deletePattern = function(ptnId) {
  console.log("[Rhombus] - deleting ptnId " + ptnId);
  var pattern = this._patterns[ptnId];

  if (notDefined(pattern)) {
    return false;
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
  return true;
};

/**
 * Adds a new track to this song. May not succeed if you already have the maximum number of tracks.
 * @returns {Number|undefined} If the insertion succeeded, returns the new track id. Otherwise, returns undefined.
 */
Rhombus.Song.prototype.addTrack = function() {
  if (this._tracks.isFull()) {
    return undefined;
  }

  // Create a new Track object
  var track = new Rhombus.Track(this._r);
  this._tracks.addObj(track);

  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._tracks.removeObj(track);
  });

  // Return the ID of the new Track
  return track._id;
};

/**
 * Removes the track with the given ID from this song.
 * @param {Number} trackID The ID of the track to delete.
 * @returns {Boolean} false if no track with the given ID existed, true otherwise.
 */
Rhombus.Song.prototype.deleteTrack = function(trkId) {
  trkId = +trkId;
  var track = this._tracks.getObjById(trkId);

  if (notDefined(track)) {
    return false;
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

  return true;
};

/**
 * @returns {Rhombus.Util.IdSlotContainer} A slot container that holds the @{link Rhombus.Track} objects in this song.
 */
Rhombus.Song.prototype.getTracks = function() {
  return this._tracks;
};

/**
 * @returns {Rhombus.Util.IdSlotContainer} A slot container that holds the @{link Rhombus.Instrument} objects in this song.
 */
Rhombus.Song.prototype.getInstruments = function() {
  return this._instruments;
};

/**
 * @returns {Object} A map from effect ids to the {@link Rhombus.Effect} objects in this song.
 */
Rhombus.Song.prototype.getEffects = function() {
  return this._effects;
};

Rhombus.Song.prototype.toJSON = function() {
  return {
    "_artist"      : this._artist,
    "_bpm"         : this._bpm,
    "_curId"       : this._curId,
    "_effects"     : this._effects,
    "_instruments" : this._instruments,
    "_length"      : this._length,
    "_loopEnd"     : this._loopEnd,
    "_loopStart"   : this._loopStart,
    "_noteCount"   : this._noteCount,
    "_patterns"    : this._patterns,
    "_soloList"    : this._soloList,
    "_title"       : this._title,
    "_tracks"      : this._tracks
  };
};

/**
 * @returns {Number} The length of this Rhombus instance's current song, in seconds.
 */
Rhombus.prototype.getSongLengthSeconds = function() {
  return this.ticks2Seconds(this._song._length);
};

Rhombus.prototype.initSong = function() {
  this._song = new Rhombus.Song(this);
  // Add the master effect
  this.addEffect("mast");
};

/**
 * Import a previously-exported song back into this Rhombus instance.
 * @param {String} json The song to be imported. Should have been created with {@link Rhombus#exportSong}.
 */
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

    var newPattern = new Rhombus.Pattern(this, +ptnId);

    newPattern._name = pattern._name;
    newPattern._length = pattern._length;

    if (isDefined(pattern._color)) {
      newPattern.setColor(pattern._color);
    }

    for (var noteId in noteMap) {
      var note = new Rhombus.Note(+noteMap[noteId]._pitch,
                                  +noteMap[noteId]._start,
                                  +noteMap[noteId]._length,
                                  +noteMap[noteId]._velocity || 1,
                                  this,
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
    var newTrack = new Rhombus.Track(this, trkId);

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

      var newItem = new Rhombus.PlaylistItem(parentId,
                                             item._ptnId,
                                             item._start,
                                             item._length,
                                             this,
                                             item._id);

      newTrack._playlist[+itemId] = newItem;
    }

    this._song._tracks.addObj(newTrack, trkIdIdx);
  }

  for (var instIdIdx in instruments._slots) {
    var instId = instruments._slots[instIdIdx];
    var inst = instruments._map[instId];
    console.log("[Rhombus.importSong] - adding instrument of type " + inst._type);
    if (isDefined(inst._sampleSet)) {
      console.log("[Rhombus.importSong] - sample set is: " + inst._sampleSet);
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

/**
 * An Array where the first entry is an AudioBuffer object for a sample, and the second is a String containing the name of the file the sample was loaded from.
 * @typedef {Array} Rhombus~sampleMapInfo
 */

/**
 * A callback used when resolving samples.
 * @callback Rhombus~sampleResolverCallback
 * @param {Object} sampleMap A map from MIDI pitches (0-127) to {@link Rhombus~sampleMapInfo} objects. Not all pitches must be mapped.
 */

/**
 * @typedef {Function} Rhombus~SampleResolver
 * @param {String} sampleSet The name of the sample set.
 * @param {Rhombus~sampleResolverCallback} callback The callback to be executed with the samples.
 */

/**
 * Provides a function responsible for loading sample sets in Rhombus.
 *
 * Whenever a sampler instrument is created, it has a sample set, represented as a String.
 * A list of sample sets supported by the library is returned by {@link Rhombus#sampleSets}.
 * The job of the sample resolver is to turn those strings into a map from MIDI pitches (0-127)
 * to Web Audio AudioBuffer objects. See the demos folder in the [GitHub repo]{@link https://github.com/soundsplosion/Rhombus} for an example implementation.
 *
 * @param {Rhombus~SampleResolver} resolver The function used to resolve samples.
 */
Rhombus.prototype.setSampleResolver = function(resolver) {
  this._sampleResolver = resolver;
};

/**
 * @returns {String} A JSON version of the song suitable for importing with {@link Rhombus#importSong}.
 */
Rhombus.prototype.exportSong = function() {
  this._song._curId = this.getCurId();
  return JSON.stringify(this._song);
};

/**
 * @returns {Rhombus.Song} The current song of this Rhombus instance.
 */
Rhombus.prototype.getSong = function() {
  return this._song;
};
