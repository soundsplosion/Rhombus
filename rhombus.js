//! rhombus.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(root) {

  // Audio Context shim stuff
  var AudioContext = root.webkitAudioContext || root.AudioContext;
  if (!AudioContext) {
    console.log("No Web Audio API support - cannot initialize Rhombus.");
    return;
  }

  // Install Rhombus object
  var r = {};
  root.Rhombus = r;

  /////////////////////////////////////////////////////////////////////////////
  // Audio Context stuff
  /////////////////////////////////////////////////////////////////////////////

  // The audio graph is HARD-CODED for now
  var ctx = new AudioContext();

  r.startPreviewNote = function(pitch) {
    // TODO: impl
  };

  r.stopPreviewNote = function(pitch) {
    // TODO: impl
  };

  /////////////////////////////////////////////////////////////////////////////
  // Instrument stuff
  /////////////////////////////////////////////////////////////////////////////

  // A simple instrument to test basic note playback
  // Voice Structure: osc. --> gain --> filter --> gain --> output
  var inst1 = {};
  r.Instrument = inst1;

  inst1.playNote = function(note) {

    var start = ctx.currentTime + note.getStart();
    var stop = start + note.getLength() + 1.0;
    var noteFreq = nn2Freq(note.getPitch());

    osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(noteFreq, ctx.currentTime);    
    
    // This gain will be swept by an envelope, VCA style
    oscGain = ctx.createGain();
    oscGain.gain.value = 0.0;    

    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 0;

    // Reduce resonance for higher notes to reduce clipping
    filter.Q.value = 3 + (1 - note.getPitch() / 127) * 9;

    // Reduce the output from the filter
    filterGain = ctx.createGain();
    filterGain.gain.value = 0.5;
    
    // Make the audio graph connections
    osc.connect(oscGain);
    oscGain.connect(filter);
    filter.connect(filterGain);
    filterGain.connect(ctx.destination);

    // Schedule the start and stop of the oscillator
    osc.start(start);
    osc.stop(stop);  
    
    // Produce a smoothly decaying volume envelope
    oscGain.gain.linearRampToValueAtTime(0.3, start + 0.005);
    oscGain.gain.linearRampToValueAtTime(0.1, start + 0.005 + note.getLength());
    oscGain.gain.linearRampToValueAtTime(0.0, start + note.getLength() + 0.5);

    // Sweep the cutoff frequency for spaced-out envelope effects!
    filter.frequency.linearRampToValueAtTime(4000, start + 0.005);
    filter.frequency.exponentialRampToValueAtTime(200, start + 0.010 + note.getLength() * 0.5);    
  }

  /////////////////////////////////////////////////////////////////////////////
  // Song data stuff
  /////////////////////////////////////////////////////////////////////////////

  // List of notes?
  var notes;

  r.getNoteCount = function() {
    // TODO: impl
  };

  r.getNote = function(index) {
    // TODO: impl
  };

  r.insertNote = function(pitch, start, length) {
    // TODO: this is a wonky implementation, just for testing/demo
    var note = new Note(pitch, start, length);
    inst1.playNote(note);
  };

  function Note(pitch, start, length) {
    // TODO: impl
    this.pitch = pitch || 60;
    this.start = start || 0;
    this.length = length || 0;
  };

  Note.prototype = {
    getPitch: function() {
      return this.pitch;
    },

    setPitch: function(pitch) {
      // TODO: impl
    },

    getStart: function() {
      return this.start;
    },

    setStart: function (start) {
      // TODO: impl
    },

    getLength: function() {
      return this.length;
    },

    setLength: function(length) {
      // TODO: impl
    },

    delete: function(length) {
      // TODO: impl
    }
  };

  /////////////////////////////////////////////////////////////////////////////
  // Scheduler stuff
  /////////////////////////////////////////////////////////////////////////////

  // Number of ms to schedule ahead
  var scheduleAhead = 100;

  // Id of the note scheduler "setTimeout" call
  var scheduleId;

  function scheduleNotes() {
    // TODO: Put some logic here
    scheduleId = root.setTimeout(scheduleNotes, 0);
  }

  /////////////////////////////////////////////////////////////////////////////
  // Playback/timebase stuff
  /////////////////////////////////////////////////////////////////////////////

  // The smallest unit of time in Rhombus is one tick
  var TICKS_PER_SECOND = 480;

  function ticks2Beats(ticks) {
    return ticks / TICKS_PER_SECOND;
  }

  function beats2Ticks(beats) {
    return beats * TICKS_PER_SECOND;
  }
  
  // This is fixed for now...
  var BPM = 120;

  r.ticks2Seconds = function(ticks) {
    return ticks2Beats(ticks) / BPM * 60;
  }

  r.seconds2Ticks = function(seconds) {
    var beats = seconds / 60 * BPM;
    return beats2Ticks(beats);
  }

  // The difference of the audio context time and the current song time
  // This value is in SECONDS
  var playing = false;
  var time = 0;

  r.startPlayback = function() {
    if (playing) {
      return;
    }

    playing = true;
    time = time - ctx.currentTime;
    console.log("start time: " + time);
    scheduleNotes();
  };

  r.stopPlayback = function() {
    if (!playing) {
      return;
    }

    playing = false;
    root.clearTimeout(scheduleId);
    time = getPosition(true);
    console.log("end time: " + time);
  };

  function getPosition(playing) {
    if (playing) {
      return ctx.currentTime + time;
    } else {
      return time;
    }
  }

  r.getPosition = function() {
    return getPosition(playing);
  };

  r.moveToPositionTicks = function(ticks) {
    var seconds = r.ticks2Seconds(ticks);
    r.moveToPositionSeconds(seconds);
  };

  r.moveToPositionSeconds = function(seconds) {
    if (playing) {
      time = seconds - ctx.currentTime;
    } else {
      time = seconds;
    };
  }
  
  r.getLoopEnabled = function() {
    // TODO: impl
  };

  r.setLoopEnabled = function(enabled) {
    // TODO: impl
  };

  r.getLoopStart = function() {
    // TODO: impl
  };

  r.setLoopStart = function(ticks) {
    // TODO: impl
  };

  r.getLoopEnd = function() {
    // TODO: impl
  };

  r.setLoopEnd = function() {
    // TODO: impl
  };

  /////////////////////////////////////////////////////////////////////////////
  // Utilities
  /////////////////////////////////////////////////////////////////////////////

  // Converts a note-number (typical range 0-127) into a frequency value
  // We'll probably just want to pre-compute a table...
  function nn2Freq(nn) {
    var freq =  Math.pow(2, (nn-69)/12) * 440;
    return freq;
  }

})(this);
