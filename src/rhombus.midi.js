//! rhombus.effect.midi.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {
  Rhombus._midiSetup = function(r) {
    r.Midi = {};

    r.Midi.makeHeaderChunk = function() {
      var arr = new Uint8Array(14);
      arr.set([77, 84, 104, 100], 0);
      arr.set(intToBytes(6), 4);
      arr.set(intToBytes(1).slice(2), 8);
      arr.set(intToBytes(r.getSong().getTracks().length()).slice(2), 10);
      arr.set(intToBytes(480).slice(2), 12);

      return arr;
    };

    r.Midi.exportSong = function() {
      var header = r.Midi.makeHeaderChunk();

      var mTrks = [];
      var dataBytes = 0;
      r._song._tracks.objIds().forEach(function(trkId) {
        var track = r._song._tracks.getObjById(trkId);
        var trkChunk = track.exportTrkChunk();
        mTrks.push(trkChunk);
        dataBytes += trkChunk.length;
      });

      var rawMidi = new Uint8Array(header.length + dataBytes);

      rawMidi.set(header, 0);

      var offset = header.length;
      for (var i = 0; i < mTrks.length; i++) {
        rawMidi.set(mTrks[i], offset);
        offset += mTrks[i].length;
      }

      document.dispatchEvent(new CustomEvent("rhombus-exportmidi", {"detail": rawMidi}));
      console.log("[Rhombus] - exported track to MIDI");

      return rawMidi;
    };

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
        body = body.concat(intToVlv(delta));
        for (var i = 0; i < node.data.length; i++) {
          body = body.concat(node.data[i]);
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

    // MIDI access object
    r._midi = null;
    r._inputMap = {};

    function printMidiMessage(event) {
      var str = "MIDI message received at timestamp " + event.timestamp + "[" + event.data.length + " bytes]: ";
      for (var i=0; i<event.data.length; i++) {
        str += "0x" + event.data[i].toString(16) + " ";
      }
      console.log(str);
    }

    function onMidiMessage(event) {
      //printMidiMessage(event);

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
