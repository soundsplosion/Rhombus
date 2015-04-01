//! rhombus.effect.midi.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {
  Rhombus._midiSetup = function(r) {

    var midi = null;  // global MIDIAccess object
    var inputMap = {};

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
      var it = midi.inputs.entries();
      for (var entry = it.next(); !entry.done; entry = it.next()) {
        var value = entry.value;
        console.log("[MidiIn] - mapping entry " + value[0]);
        inputMap[value[0]] = value[1];
        value[1].onmidimessage = onMidiMessage;
      }
    }

    function onMidiSuccess(midiAccess) {
      console.log("MIDI ready!");
      midi = midiAccess;
      mapMidiInputs(midi);
    }

    function onMidiFailure(msg) {
      console.log( "Failed to get MIDI access - " + msg );
    }

    r.getMidiAccess = function() {
      var midi = null;
      if (typeof navigator.requestMIDIAccess !== "undefined") {
        navigator.requestMIDIAccess().then(onMidiSuccess, onMidiFailure);
      }
    }
  };
})(this.Rhombus);
