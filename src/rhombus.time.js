//! rhombus.time.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._timeSetup = function(r) {
    function createScheduleWorker() {
      var code =
      "var scheduleId = false;\n" +
      "self.onmessage = function(oEvent) {\n" +
      "  if (oEvent.data.playing === false) {\n" +
      "    if (scheduleId) {\n" +
      "      clearTimeout(scheduleId);\n" +
      "    }\n" +
      "  } else {\n" +
      "    triggerSchedule();\n" +
      "  }\n" +
      "}\n" +
      "function triggerSchedule() {\n" +
      "  postMessage(0);\n" +
      "  scheduleId = setTimeout(triggerSchedule, 10);\n" +
      "}\n";
      var blob = new Blob([code], {type: "application/javascript"});
      return new Worker(URL.createObjectURL(blob));
    }

    var scheduleWorker = createScheduleWorker();
    scheduleWorker.onmessage = scheduleNotes;

    // Number of seconds to schedule ahead
    var scheduleAhead = 0.050;

    var lastScheduled = -1;

    // TODO: scheduling needs to happen relative to that start time of the
    //       pattern
    function scheduleNotes() {
      var nowTicks = r.seconds2Ticks(r.getPosition());
      var aheadTicks = r.seconds2Ticks(scheduleAhead);

      // Determine if playback needs to loop around in this time window
      var doWrap = r.getLoopEnabled() && (r.getLoopEnd() - nowTicks < aheadTicks);

      var scheduleStart = lastScheduled;
      var scheduleEnd = (doWrap) ? r.getLoopEnd() : nowTicks + aheadTicks;

      for (var ptnId in r._song._patterns) {
        // Grab the notes for the current pattern
        var noteMap = r._song._patterns[ptnId]._noteMap;
        var playingNotes = r._song._patterns[ptnId]._playingNotes;

        // TODO: find a more efficient way to determine which notes to play
        if (r.isPlaying()) {
          for (var noteId in noteMap) {
            var note = noteMap[noteId];
            var start = note.getStart();
            var end = note.getEnd();

            if (start >= scheduleStart && start < scheduleEnd) {
              var delay = r.ticks2Seconds(start) - r.getPosition();
              r.Instrument.triggerAttack(note._id, note.getPitch(), delay);
              playingNotes[note._id] = note;
            }
          }
        }

        for (var noteId in playingNotes) {
          var note = playingNotes[noteId];
          var start = note.getStart();
          var end = note.getEnd();

          if (end >= scheduleStart && end < scheduleEnd) {
            var delay = r.ticks2Seconds(end) - r.getPosition();
            r.Instrument.triggerRelease(note._id, delay);
            delete playingNotes[noteId];
          }
        }
      }

      lastScheduled = scheduleEnd;

      if (doWrap) {
        r.loopPlayback(nowTicks);
      }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Playback/timebase stuff
    /////////////////////////////////////////////////////////////////////////////

    // The smallest unit of time in Rhombus is one tick, and there are 480 ticks
    // per quarter note
    var TICKS_PER_SECOND = 480;

    function ticks2Beats(ticks) {
      return ticks / TICKS_PER_SECOND;
    }

    function beats2Ticks(beats) {
      return beats * TICKS_PER_SECOND;
    }

    // TODO: implement variable BPM
    var BPM = 120;

    r.ticks2Seconds = function(ticks) {
      return ticks2Beats(ticks) / BPM * 60;
    }

    r.seconds2Ticks = function(seconds) {
      var beats = seconds / 60 * BPM;
      return beats2Ticks(beats);
    }

    var playing = false;
    var time = 0;

    // Loop start and end position in ticks, default is one measure
    var loopStart   = 0;
    var loopEnd     = 1920;
    var loopEnabled = false;

    function resetPlayback() {
      lastScheduled = -1;

      for (var ptnId in r._song._patterns) {
        var noteMap = r._song._patterns[ptnId]._noteMap;
        var playingNotes = r._song._patterns[ptnId]._playingNotes;

        for (var noteId in playingNotes) {
          var note = playingNotes[noteId];
          r.Instrument.noteOff(note._id, 0);
          delete playingNotes[noteId];
        }
      }

      r.Instrument.killAllNotes();
    }

    r.startPlayback = function() {
      if (!r._active || playing) {
        return;
      }

      playing = true;

      // TODO: song start position needs to be defined somewhere

      // Begin slightly before the start position to prevent
      // missing notes at the beginning
      r.moveToPositionSeconds(-0.010);

      // Force the first round of scheduling
      scheduleNotes();

      scheduleWorker.postMessage({ playing: true });
    };

    r.stopPlayback = function() {
      if (!r._active || !playing) {
        return;
      }

      playing = false;

      resetPlayback();

      time = getPosition(true);
      scheduleWorker.postMessage({ playing: false });
    };

    r.loopPlayback = function (nowTicks) {
      var tickDiff = nowTicks - loopEnd;
      if (tickDiff >= 0 && loopEnabled === true) {
        // make sure the notes near the start of the loop aren't missed
        r.moveToPositionTicks(loopStart - 0.001);
        scheduleNotes();

        // adjust the playback position to help mitigate timing drift
        r.moveToPositionTicks(loopStart + tickDiff);
        //lastScheduled = loopStart - tickDiff;
        scheduleNotes();
      }
    };

    function getPosition(playing) {
      if (playing) {
        return r._ctx.currentTime + time;
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
        resetPlayback();
        time = seconds - r._ctx.currentTime;
      } else {
        time = seconds;
      };
    };

    r.getLoopEnabled = function() {
      return loopEnabled;
    };

    r.setLoopEnabled = function(enabled) {
      loopEnabled = enabled;
    };

    r.getLoopStart = function() {
      return loopStart;
    };

    r.setLoopStart = function(ticks) {
      loopStart = ticks;
    };

    r.getLoopEnd = function() {
      return loopEnd;
    };

    r.setLoopEnd = function(ticks) {
      loopEnd = ticks;
    };

    r.isPlaying = function() {
      return playing;
    };
  };
})(this.Rhombus);
