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
        "  scheduleId = setTimeout(triggerSchedule, 5);\n" +
        "}\n";
      var blob = new Blob([code], {type: "application/javascript"});
      return new Worker(URL.createObjectURL(blob));
    }

    var scheduleWorker = createScheduleWorker();
    scheduleWorker.onmessage = scheduleNotes;

    // Number of seconds to schedule ahead
    var scheduleAhead = 0.050;
    var lastScheduled = -1;

    function scheduleNotes() {

      // capturing the current time and position so that all scheduling actions
      // in this time frame are on the same "page," so to speak
      var curTime = r.getElapsedTime();
      var curPos = r.getPosition();
      var nowTicks = r.seconds2Ticks(curPos);
      var aheadTicks = r.seconds2Ticks(scheduleAhead);
      var loopStart = r.getLoopStart();
      var loopEnd = r.getLoopEnd();

      // Determine if playback needs to loop around in this time window
      var doWrap = r.getLoopEnabled() && (r.getLoopEnd() - nowTicks < aheadTicks);

      var scheduleStart = lastScheduled;
      var scheduleEnd = (doWrap) ? r.getLoopEnd() : nowTicks + aheadTicks;

      // TODO: decide to use the elapsed time since playback started,
      //       or the context time
      var scheduleEndTime = curTime + scheduleAhead;

      // Iterate over every track to find notes that can be scheduled
      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        // Schedule note-offs for notes playing on the current track.
        // Do this before scheduling note-ons to prevent back-to-back notes from
        // interfering with each other.
        for (var rtNoteId in playingNotes) {
          var rtNote = playingNotes[rtNoteId];
          var end = rtNote._end;

          if (end <= scheduleEndTime) {
            var delay = end - curTime;
            r._song._instruments[rtNote._target].triggerRelease(rtNote._id, delay);
            delete playingNotes[rtNoteId];
          }
        }

        if (r.isPlaying()) {
          for (var playlistId in track._playlist) {
            var ptnId     = track._playlist[playlistId]._ptnId;
            var itemStart = track._playlist[playlistId]._start;
            var itemEnd   = itemStart + track._playlist[playlistId]._length;

            // Don't schedule notes from playlist items that aren't in this
            // scheduling window
            if ((itemStart < scheduleStart && itemEnd < scheduleStart) ||
                (itemStart > scheduleEnd)) {
              continue;
            }

            var noteMap = r._song._patterns[ptnId]._noteMap;

            // TODO: find a more efficient way to determine which notes to play
            for (var noteId in noteMap) {
              var note = noteMap[noteId];
              var start = note.getStart() + itemStart;

              if (r.getLoopEnabled() && start < loopStart) {
                continue;
              }

              if (start >= scheduleStart &&
                  start < scheduleEnd &&
                  start < itemEnd) {
                var delay = r.ticks2Seconds(start) - curPos;

                var startTime = curTime + delay;
                var endTime = startTime + r.ticks2Seconds(note._length);

                var rtNote = new r.RtNote(note._pitch, startTime, endTime, track._target);
                playingNotes[rtNote._id] = rtNote;

                r._song._instruments[track._target].triggerAttack(rtNote._id, note.getPitch(), delay);
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
    var TICKS_PER_BEAT = 480;

    function ticks2Beats(ticks) {
      return ticks / TICKS_PER_BEAT;
    }

    function beats2Ticks(beats) {
      return beats * TICKS_PER_BEAT;
    }

    r.ticks2Seconds = function(ticks) {
      return (ticks2Beats(ticks) / r._song._bpm) * 60;
    }

    r.seconds2Ticks = function(seconds) {
      var beats = (seconds / 60) * r._song._bpm;
      return beats2Ticks(beats);
    }

    r.setBpm = function(bpm) {
      if (notDefined(bpm) || isNull(bpm) || isNaN(+bpm) ||
          +bpm < 1 || +bpm > 1000) {
        console.log("[Rhombus] - Invalid tempo");
        return undefined;
      }

      // Rescale the end time of notes that are currently playing
      var timeScale = r._song._bpm / +bpm;
      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        for (var noteId in track._playingNotes) {
          var note = track._playingNotes[noteId];
          var oldDuration = note._end - note._start;
          var newDuration = oldDuration * timeScale;
          note._end = note._start + newDuration;
        }
      }

      // Cache the old position in ticks
      var oldTicks = r.seconds2Ticks(r.getPosition());
      r._song._bpm = +bpm;

      // Set the time position to the adjusted location
      r.moveToPositionTicks(oldTicks);
      return bpm;
    }

    r.getBpm = function() {
      return r._song._bpm;
    }

    var playing = false;
    var time = 0;
    var startTime = 0;

    // Loop start and end position in ticks, default is one measure
    //var loopStart   = 0;
    //var loopEnd     = 1920;
    var loopEnabled = false;

    r.killAllNotes = function() {
      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        for (var rtNoteId in playingNotes) {
          for (var instId in r._song._instruments) {
            r._song._instruments[instId].triggerRelease(rtNoteId, 0);
          }
          delete playingNotes[rtNoteId];
        }
      }
    };

    r.startPlayback = function() {
      if (!r._active || playing) {
        return;
      }

      // Flush any notes that might be lingering
      lastScheduled = r.seconds2Ticks(time);
      r.killAllNotes();

      playing = true;
      r.moveToPositionSeconds(time);
      startTime = r._ctx.currentTime;

      // Force the first round of scheduling
      scheduleNotes();

      // Restart the worker
      scheduleWorker.postMessage({ playing: true });
    };

    r.stopPlayback = function() {
      if (!r._active || !playing) {
        return;
      }

      playing = false;
      scheduleWorker.postMessage({ playing: false });
      lastScheduled = r.seconds2Ticks(time);
      r.killAllNotes();
      time = getPosition(true);
    };

    r.loopPlayback = function (nowTicks) {
      var tickDiff = nowTicks - r._song._loopEnd;

      if (tickDiff > 0) {
        console.log("[Rhombus] - Loopback missed loop start by " + tickDiff + " ticks");
        lastScheduled = r._song._loopStart;
        r.moveToPositionTicks(r._song._loopStart);
      }

      lastScheduled = r._song._loopStart + tickDiff;
      r.moveToPositionTicks(r._song._loopStart + tickDiff);
      scheduleNotes();
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
      lastScheduled = ticks;
      var seconds = r.ticks2Seconds(ticks);
      r.moveToPositionSeconds(seconds);
    };

    r.moveToPositionSeconds = function(seconds) {
      if (playing) {
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
      return r._song._loopStart;
    };

    r.setLoopStart = function(start) {
      if (notDefined(start) || isNull(start)) {
        console.log("[Rhombus] - Loop start is undefined");
        return undefined;
      }

      if (start >= r._song._loopEnd || (r._song._loopEnd - start) < 480) {
        console.log("[Rhombus] - Invalid loop range");
        return undefined;
      }
      r._song._loopStart = start;
      return r._song._loopStart;
    };

    r.getLoopEnd = function() {
      return r._song._loopEnd;
    };

    r.setLoopEnd = function(end) {
      if (notDefined(end) || isNull(end)) {
        console.log("[Rhombus] - Loop end is undefined");
        return undefined;
      }


      if (r._song._loopStart >= end || (end - r._song._loopStart) < 480) {
        console.log("[Rhombus] - Invalid loop range");
        return undefined;
      }
      r._song._loopEnd = end;
      return r._song._loopEnd;
    };

    r.isPlaying = function() {
      return playing;
    };
  };
})(this.Rhombus);
