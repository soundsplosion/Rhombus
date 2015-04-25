//! rhombus.midi.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus.Midi = function(r) {
  this._r = r;
  this._midi = null;
  this._inputMap = {};
};

// Returns a MIDI Type 1 header chunk based on the current song
Rhombus.Midi.prototype.makeHeaderChunk = function() {
  var arr = new Uint8Array(14);

  // ['M', 'T', 'r', 'k'] header
  arr.set([77, 84, 104, 100], 0);

  // number of data bytes in chunk
  arr.set(intToBytes(6), 4);

  // specify Type 1 format
  arr.set(intToBytes(1).slice(2), 8);

  // specify the number of tracks
  arr.set(intToBytes(this._r.getSong().getTracks().length()).slice(2), 10);

  // specify the timebase resolution
  arr.set(intToBytes(480).slice(2), 12);

  return arr;
};

// Exports the current song structure to a raw byte array in Type 1 MIDI format
// Only the note data is exported, no tempo or time signature information
Rhombus.Midi.prototype.getRawMidi = function() {
  // render each Rhombus track to a MIDI track chunk
  var mTrks    = [];
  var numBytes = 0;
  var r = this._r;
  var that = this;
  r._song._tracks.objIds().forEach(function(trkId) {
    var track = r._song._tracks.getObjById(trkId);
    var trkChunk = this.eventsToMTrk(track.exportEvents());
    mTrks.push(trkChunk);
    numBytes += trkChunk.length;
  });

  var header = this.makeHeaderChunk();

  // allocate the byte array
  var rawMidi = new Uint8Array(header.length + numBytes);

  // set the file header
  rawMidi.set(header, 0);

  // insert each track chunk at the appropriate offset
  var offset = header.length;
  for (var i = 0; i < mTrks.length; i++) {
    rawMidi.set(mTrks[i], offset);
    offset += mTrks[i].length;
  }

  return rawMidi;
};

// Passes the raw MIDI dump to any interested parties (e.g., the front-end)
Rhombus.Midi.prototype.exportSong = function() {
  var rawMidi = this.getRawMidi();
  document.dispatchEvent(new CustomEvent("rhombus-exportmidi", {"detail": rawMidi}));
};

// Converts a list of track events to a MIDI Track Chunk
Rhombus.Midi.prototype.eventsToMTrk = function(events) {
  var header = [ 77, 84, 114, 107 ];  // 'M' 'T' 'r' 'k'
  var body   = [ ];

  var lastStep = 0;
  events.executeOnEveryNode(function (node) {
    if (notDefined(node.key)) {
      console.log("[Rhombus.MIDI - node is not defined");
      return undefined;
    }

    var delta = node.key - lastStep;
    lastStep = node.key;
    for (var i = 0; i < node.data.length; i++) {
      body = body.concat(intToVlv(delta));
      body = body.concat(node.data[i]);
      delta = 0;
    }
  });

  // set the chunk size
  header = header.concat(intToBytes(body.length));

  // append the body
  header = header.concat(body);

  var trkChunk = new Uint8Array(header.length);
  for (var i = 0; i < header.length; i++) {
    trkChunk[i] = header[i];
  }

  return trkChunk;
};

Rhombus.prototype.getMidiAccess = function() {
  var that = this;

  function onMidiMessage(event) {
    // silently ignore active sense messages
    if (event.data[0] === 0xFE) {
      return;
    }

    // only handle well-formed notes for now (don't worry about running status, etc.)
    if (event.data.length !== 3) {
      console.log("[MidiIn] - ignoring MIDI message");
      return;
    }
    // parse the message bytes
    var cmd   = event.data[0] & 0xF0;
    var chan  = event.data[0] & 0x0F;
    var pitch = event.data[1];
    var vel   = event.data[2];

    // check for note-off messages
    if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
      console.log("[MidiIn] - Note-Off, pitch: " + pitch + "; velocity: " + vel.toFixed(2));
      that.stopPreviewNote(pitch);
    }

    // check for note-on messages
    else if (cmd === 0x90 && vel > 0) {
      vel /= 127;
      console.log("[MidiIn] - Note-On, pitch: " + pitch + "; velocity: " + vel.toFixed(2));
      that.startPreviewNote(pitch, vel);
    }

    // don't worry about other message types for now
  }


  function mapMidiInputs(midi) {
    that.Midi._inputMap = {};
    var it = midi.inputs.entries();
    for (var entry = it.next(); !entry.done; entry = it.next()) {
      var value = entry.value;
      console.log("[MidiIn] - mapping entry " + value[0]);
      that.Midi._inputMap[value[0]] = value[1];
      value[1].onmidimessage = onMidiMessage;
    }
  }

  function onMidiSuccess(midiAccess) {
    console.log("[Rhombus] - MIDI Access Successful");
    that.Midi._midi = midiAccess;
    mapMidiInputs(that.Midi._midi);
  }

  function onMidiFailure(msg) {
    console.log("Failed to get MIDI access - " + msg );
  }


  this.Midi._midi = null;
  if (typeof navigator.requestMIDIAccess !== "undefined") {
    navigator.requestMIDIAccess().then(onMidiSuccess, onMidiFailure);
  }
};

Rhombus.prototype.enableMidi = function() {
  this.getMidiAccess();
};
