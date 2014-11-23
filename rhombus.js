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

  function Note(pitch, start, length) {
    // TODO: impl
  };

  Note.prototype = {
    getPitch: function() {
      // TODO: impl
    },

    setPitch: function(pitch) {
      // TODO: impl
    },

    getStart: function() {
      // TODO: impl
    },

    setStart: function (start) {
      // TODO: impl
    },

    getLength: function() {
      // TODO: impl
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
  var debugFn;

  r.setDebugFunction = function(fn) {
    debugFn = fn;
  }

  function scheduleNotes() {
    if (debugFn) {
      debugFn();
    }

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

})(this);
