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

    // Number of ms to schedule ahead
    var scheduleAhead = 100;

    var lastScheduled = 0;
    function scheduleNotes() {
      var notes = r._song.notes;

      var nowTicks = r.seconds2Ticks(r.getPosition());
      var scheduleStart = lastScheduled;
      var scheduleEnd = nowTicks + scheduleAhead;
      var scheduleTo = nowTicks + scheduleAhead;

      var count = 0;
      // May want to avoid iterating over all the notes every time
      for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        var start = note.getStart();
        var end = start + note.getLength();

        if (start > scheduleStart && start < scheduleEnd) {
          var delay = r.ticks2Seconds(start) - r.getPosition();
          r.Instrument.noteOn(note.getPitch(), delay);
          count += 1;
        }

        if (end > scheduleStart && end < scheduleEnd) {
          var delay = r.ticks2Seconds(end) - r.getPosition();
          r.Instrument.noteOff(note.getPitch(), delay);
          count += 1;
        }
      }

      lastScheduled = scheduleTo;
      if (count > 0) {
        console.log("scheduled (" + scheduleStart + ", " + scheduleEnd + "): " + count + " events");
      }
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

    var playing = false;
    var time = 0;

    function resetPlayback() {
      lastScheduled = 0;
      r.Instrument.killAllNotes();
    }

    r.startPlayback = function() {
      if (playing) {
        return;
      }

      playing = true;
      time = time - r._ctx.currentTime;
      scheduleWorker.postMessage({ playing: true });
    };

    r.stopPlayback = function() {
      if (!playing) {
        return;
      }

      resetPlayback();

      playing = false;
      time = getPosition(true);
      scheduleWorker.postMessage({ playing: false });
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
  };
})(this.Rhombus);
