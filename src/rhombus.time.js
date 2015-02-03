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
    var scheduleAhead = 0.030;
    var lastScheduled = -1;

    // TODO: scheduling needs to happen relative to that start time of the
    // pattern
    function scheduleNotes() {
      // capturing the current time and position so that all scheduling actions
      // in this time frame are on the same "page," so to speak
      var curTime = r.getElapsedTime();
      var curPos = r.getPosition();
      var nowTicks = r.seconds2Ticks(curPos);
      var aheadTicks = r.seconds2Ticks(scheduleAhead);

      // Determine if playback needs to loop around in this time window
      var doWrap = r.getLoopEnabled() && (r.getLoopEnd() - nowTicks < aheadTicks);

      var scheduleStart = lastScheduled;
      var scheduleEnd = (doWrap) ? r.getLoopEnd() : nowTicks + aheadTicks;

      // TODO: decide to used the elapsed time since playback started,
      //       or the context time
      var scheduleEndTime = curTime + scheduleAhead;

      // Iterate over every track to find notes that can be scheduled
      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        // Schedule note-offs for notes playing on the current track.
        // Do this before schedyling note-ons to prevent back-to-back notes from
        // interfering with each other.
        for (var rtNoteId in playingNotes) {
          var rtNote = playingNotes[rtNoteId];
          var end = rtNote._end;

          if (end <= scheduleEndTime) {
            var delay = end - curTime;

            r.Instrument.triggerRelease(rtNote._id, delay);
            delete playingNotes[rtNoteId];
          }
        }

        // TODO: Find a way to determine which patterns are really schedulable,
        //       based on the current playback position
        for (var playlistId in track._playlist) {
          var ptnId   = track._playlist[playlistId]._ptnId;
          var noteMap = r._song._patterns[ptnId]._noteMap;

          // TODO: Handle note start and end times relative to the start of
          //       the originating pattern

          // TODO: find a more efficient way to determine which notes to play
          if (r.isPlaying()) {
            for (var noteId in noteMap) {
              var note = noteMap[noteId];
              var start = note.getStart();

              if (start >= scheduleStart && start <= scheduleEnd) {
                var delay = r.ticks2Seconds(start) - curPos;

                var startTime = curTime + delay;
                var endTime = startTime + r.ticks2Seconds(note._length);

                var rtNote = new r.RtNote(note._pitch, startTime, endTime);
                playingNotes[rtNote._id] = rtNote;

                r.Instrument.triggerAttack(rtNote._id, note.getPitch(), delay);
              }
            }
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

    // The smallest unit of musical time in Rhombus is one tick, and there are
    // 480 ticks per quarter note
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
    var startTime = 0;

    // Loop start and end position in ticks, default is one measure
    var loopStart   = 0;
    var loopEnd     = 1920;
    var loopEnabled = false;

    function resetPlayback() {
      lastScheduled = -1;

      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        for (var rtNoteId in playingNotes) {
          var rtNote = playingNotes[rtNoteId];
          r.Instrument.triggerRelease(rtNoteid, 0);
          delete playingNotes[rtNoteId];
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
      r.moveToPositionSeconds(-0.001);

      startTime = r._ctx.currentTime;

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

        // TODO: Remove this awful kludge
        // make sure the notes near the start of the loop aren't missed

        lastScheduled = loopStart;

        r.moveToPositionTicks(loopStart);
        scheduleNotes();

        // adjust the playback position to help mitigate timing drift
        r.moveToPositionTicks(loopStart + tickDiff);

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

    r.getElapsedTime = function() {
      return r._ctx.currentTime - startTime;
    };

    r.getElapsedTicks = function() {
      return r.seconds2Ticks(r.getElapsedTime());
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
