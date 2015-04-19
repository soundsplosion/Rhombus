//! rhombus.effect.midi.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {
  Rhombus._midiSetup = function(r) {
    r.Midi = {};

    // MIDI access object
    r._midi = null;
    r._inputMap = {};

    // Returns a MIDI Type 1 header chunk based on the current song
    r.Midi.makeHeaderChunk = function() {
      var arr = new Uint8Array(14);

      // ['M', 'T', 'r', 'k'] header
      arr.set([77, 84, 104, 100], 0);

      // number of data bytes in chunk
      arr.set(intToBytes(6), 4);

      // specify Type 1 format
      arr.set(intToBytes(1).slice(2), 8);

      // specify the number of tracks
      arr.set(intToBytes(r.getSong().getTracks().length()).slice(2), 10);

      // specify the timebase resolution
      arr.set(intToBytes(480).slice(2), 12);

      return arr;
    };

    // Exports the current song structure to a raw byte array in Type 1 MIDI format
    // Only the note data is exported, no tempo or time signature information
    r.Midi.getRawMidi = function() {
      // render each Rhombus track to a MIDI track chunk
      var mTrks    = [];
      var numBytes = 0;
      r._song._tracks.objIds().forEach(function(trkId) {
        var track = r._song._tracks.getObjById(trkId);
        var trkChunk = r.Midi.eventsToMTrk(track.exportEvents());
        mTrks.push(trkChunk);
        numBytes += trkChunk.length;
      });

      var header = r.Midi.makeHeaderChunk();

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
    r.Midi.exportSong = function() {
      var rawMidi = r.Midi.getRawMidi();
      document.dispatchEvent(new CustomEvent("rhombus-exportmidi", {"detail": rawMidi}));
    };

    // Converts a list of track events to a MIDI Track Chunk
    r.Midi.eventsToMTrk = function(events) {
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

    function printMidiMessage(event) {
      var str = "MIDI message received at timestamp " + event.timestamp + "[" + event.data.length + " bytes]: ";
      for (var i=0; i<event.data.length; i++) {
        str += "0x" + event.data[i].toString(16) + " ";
      }
      console.log(str);
    }

    function onMidiMessage(event) {

      // only handle well-formed notes for now (don't worry about running status, etc.)
      if (event.data.length !== 3) {
        console.log("[MidiIn] - ignoring MIDI message");
        return;
      }

      // silently ignore active sense messages
      if (event.data[0] === 0xFE) {
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
        rhomb.stopPreviewNote(pitch);
      }

      // check for note-on messages
      else if (cmd === 0x90 && vel > 0) {
        vel /= 127;
        console.log("[MidiIn] - Note-On, pitch: " + pitch + "; velocity: " + vel.toFixed(2));
        rhomb.startPreviewNote(pitch, vel);
      }

      // don't worry about other message types for now
    }

    function mapMidiInputs(midi) {
      r._inputMap = {};
      var it = midi.inputs.entries();
      for (var entry = it.next(); !entry.done; entry = it.next()) {
        var value = entry.value;
        console.log("[MidiIn] - mapping entry " + value[0]);
        r._inputMap[value[0]] = value[1];
        value[1].onmidimessage = onMidiMessage;
      }
    }

    function onMidiSuccess(midiAccess) {
      console.log("[Rhombus] - MIDI Access Successful");
      r._midi = midiAccess;
      mapMidiInputs(r._midi);
    }

    function onMidiFailure(msg) {
      console.log( "Failed to get MIDI access - " + msg );
    }

    r.getMidiAccess = function() {
      r._midi = null;
      if (typeof navigator.requestMIDIAccess !== "undefined") {
        navigator.requestMIDIAccess().then(onMidiSuccess, onMidiFailure);
      }
    };
  };
})(this.Rhombus);
