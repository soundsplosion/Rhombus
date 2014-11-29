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
  function Instrument(ctx) {
    
    // It might be handy to mainatain a handle on the AudioContext?
    this.ctx = ctx;

    // These variables are to keep track of the playback state
    this.playing = false;
    this.currentNote = undefined;

    // Instantiate the modules for the synth voice
    this.osc = ctx.createOscillator();
    this.oscGain = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filterGain = ctx.createGain();

    // Initialize the synth voice
    this.osc.type = 'square';
    this.osc.start(0);
    this.oscGain.gain.value = 0.0;
    this.filter.type = "lowpass";
    this.filter.frequency.value = 0;

    // Make the audio graph connections
    this.osc.connect(this.oscGain);
    this.oscGain.connect(this.filter);
    this.filter.connect(this.filterGain);
    this.filterGain.connect(this.ctx.destination);

    // Attenuate the output from the filter
    this.filterGain.gain.value = 0.5;
  }

  Instrument.prototype = {

    // Play back a simple synth voice at the pitch specified by the input note
    noteOn: function(note) {

      // Don't play out-of-range notes
      if (note.getPitch() < 0 || note.getPitch() > 127)
	return;

      // Set the 'playing' flag to prevent retrigger before noteOff()
      this.playing = true;
      
      // Keep track of the note that is currently sounding
      this.currentNote = note;	

      var start = this.ctx.currentTime;
      var noteFreq = noteNum2Freq(note.getPitch());

      // Cancel any of the scheduled AudioParam changes from previos Notes
      this.osc.frequency.cancelScheduledValues(start);
      this.filter.frequency.cancelScheduledValues(start);
      this.oscGain.gain.cancelScheduledValues(start);

      // Immediately set the frequency of the oscillator based on the note
      this.osc.frequency.setValueAtTime(noteFreq, this.ctx.currentTime);

      // Reduce resonance for higher notes to reduce clipping
      this.filter.Q.value = 3 + (1 - note.getPitch() / 127) * 9;

      // Produce a smoothly-decaying volume envelope
      this.oscGain.gain.linearRampToValueAtTime(0.6, start + 0.005);
      this.oscGain.gain.linearRampToValueAtTime(0.4, start + 0.100);

      // Sweep the cutoff frequency for spaced-out envelope effects!
      this.filter.frequency.linearRampToValueAtTime(4000, start + 0.005);
      this.filter.frequency.exponentialRampToValueAtTime(200, start + 0.250);
    },

    // Stop the playback of the currently-sounding note
    noteOff: function(note) {
      this.playing = false;
      this.currentNote = undefined;
      this.oscGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.125);
    }
  };

  // I'm not quite sure how to "install" the default instrument...
  var inst1 = new Instrument(ctx);
  r.Instrument = inst1;

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
    // TODO: impl
  };

  r.makeNote = function(noteNum) {
    var note = new Note(noteNum, 0, 0);
    return note;
  }

  function Note(pitch, start, length) {
    // TODO: check implementation, and add more fields (?)
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
  function noteNum2Freq(noteNum) {
    var freq =  Math.pow(2, (noteNum-69)/12) * 440;
    return freq;
  }

})(this);
