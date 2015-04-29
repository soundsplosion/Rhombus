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

    var playing = false;
    var time = 0;
    var startTime = 0;

    var loopEnabled = false;
    var loopOverride = false;

    function scheduleNotes() {

      // capturing the current time and position so that all scheduling actions
      // in this time frame are on the same "page," so to speak
      var curTime = r.getElapsedTime();
      var curPos = r.getPosition();
      var nowTicks = r.seconds2Ticks(curPos);
      var aheadTicks = r.seconds2Ticks(scheduleAhead);
      var loopStart = r.getLoopStart();
      var loopEnd = r.getLoopEnd();
      var songEnd = r.getSong().getLength();

      // Determine if playback needs to loop around in this time window
      var doWrap = (!loopOverride && r.getLoopEnabled()) &&
        (r.getLoopEnd() - nowTicks < aheadTicks);

      var scheduleStart = lastScheduled;
      var scheduleEnd = (doWrap) ? r.getLoopEnd() : nowTicks + aheadTicks;
      scheduleEnd = (scheduleEnd < songEnd) ? scheduleEnd : songEnd;

      // TODO: decide to use the elapsed time since playback started,
      //       or the context time
      var scheduleEndTime = curTime + scheduleAhead;

      // Iterate over every track to find notes that can be scheduled
      r._song._tracks.objIds().forEach(function(trkId) {
        var track = r._song._tracks.getObjById(trkId);
        var playingNotes = track._playingNotes;

        var elapsedNotes = [];

        // Schedule note-offs for notes playing on the current track.
        // Do this before scheduling note-ons to prevent back-to-back notes from
        // interfering with each other.
        for (var rtNoteId in playingNotes) {
          var rtNote = playingNotes[rtNoteId];
          var end = rtNote._end;

          if (end <= scheduleEndTime) {
            var delay = end - curTime;

            elapsedNotes.push([rtNote._id, delay]);

            delete playingNotes[rtNoteId];
          }
        }

        for (var i = 0; i < track._targets.length; i++) {
          var inst = r._song._instruments.getObjById(track._targets[i]);
          for (var j = 0; j < elapsedNotes.length; j++) {
            inst.triggerRelease(elapsedNotes[j][0], elapsedNotes[j][1]);
          }
        }

        // Determine how soloing and muting affect this track
        var inactive = track._mute || (r._song._soloList.length > 0 && !track._solo);

        if (!r.isPlaying() || inactive) {
          track.killAllNotes();
        }
        else {
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

            var begin = scheduleStart - itemStart;
            var end   = begin + (scheduleEnd - scheduleStart);
            var pattern = r.getSong().getPatterns()[ptnId];

            // Schedule automation events
            var events = pattern.getAutomationEventsInRange(begin, end);
            for (var i = 0; i < events.length; i++) {
              var ev = events[i];

              // Lots of this copied from the note loop below...
              var time = ev.getTime() + itemStart;

              if (!loopOverride && r.getLoopEnabled() && time < loopStart) {
                continue;
              }

              if (time >= itemEnd) {
                continue;
              }

              var delay = r.ticks2Seconds(time) - curPos;
              var realTime = curTime + delay + startTime;

              track._targets.forEach(function(id) {
                var instr = r.graphLookup(id);
                instr._setAutomationValueAtTime(ev.getValue(), realTime);
              });
              track._effectTargets.forEach(function(id) {
                var eff = r.graphLookup(id);
                eff._setAutomationValueAtTime(ev.getValue(), realTime);
              });
            }

            // Schedule notes
            var notes = pattern.getNotesInRange(begin, end, true);

            for (var i = 0; i < notes.length; i++) {
              var note  = notes[i];
              var start = note.getStart() + itemStart;

              // prevent notes from before the loop start from triggering
              if (!loopOverride && r.getLoopEnabled() && start < loopStart) {
                continue;
              }

              // prevent other spurious note triggers
              if (start >= itemEnd) {
                continue;
              }

              var delay = r.ticks2Seconds(start) - curPos;

              var noteStartTime = curTime + delay;
              var endTime = noteStartTime + r.ticks2Seconds(note._length);

              var rtNote = new Rhombus.RtNote(note.getPitch(),
                                              note.getVelocity(),
                                              noteStartTime,
                                              endTime,
                                              track._id,
                                              r);

              playingNotes[rtNote._id] = rtNote;

              for (var targetIdx = 0; targetIdx < track._targets.length; targetIdx++) {
                var instrument = r._song._instruments.getObjById(track._targets[targetIdx]);
                instrument.triggerAttack(rtNote._id, note.getPitch(), delay, note.getVelocity());
              }
            }
          }
        }
      });

      lastScheduled = scheduleEnd;

      if (nowTicks >= r.getLoopStart() && nowTicks < r.getLoopEnd()) {
        loopOverride = false;
      }

      if (doWrap) {
        r.loopPlayback(nowTicks);
      }
      else if (nowTicks >= r.getSong().getLength()) {
        r.stopPlayback();
        document.dispatchEvent(new CustomEvent("rhombus-stop", {"detail": "stop"}));
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

      var oldBpm = this._song._bpm;
      var that = this;
      r.Undo._addUndoAction(function() {
        that.setBpm(oldBpm);
      });

      // Rescale the end time of notes that are currently playing
      var timeScale = this._song._bpm / +bpm;
      var curTime = r.getElapsedTime();

      for (var trkIdx in this._song._tracks._slots) {
        var track = this._song._tracks.getObjBySlot(trkIdx);
        for (var noteId in track._playingNotes) {
          var note = track._playingNotes[noteId];
          var timeRemaining = (note._end - curTime) * timeScale;
          note._end = curTime + timeRemaining;
        }
      }

      // Cache the old position in ticks
      var oldTicks = this.seconds2Ticks(r.getPosition());
      this._song._bpm = +bpm;

      // Set the time position to the adjusted location
      this.moveToPositionTicks(oldTicks);
      return bpm;
    }

    r.getBpm = function() {
      return this._song._bpm;
    }

    r.killAllNotes = function() {
      var that = this;
      that._song._tracks.objIds().forEach(function(trkId) {
        var track = that._song._tracks.getObjById(trkId);
        var playingNotes = track._playingNotes;

        for (var rtNoteId in playingNotes) {
          that._song._instruments.objIds().forEach(function(instId) {
            that._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
          });
          delete playingNotes[rtNoteId];
        }
      });
    };

    r.panic = function() {
      this.killAllNotes();
      this.killAllPreviewNotes();
    };

    r.startPlayback = function() {
      if (this._disposed || playing) {
        return;
      }

      // Flush any notes that might be lingering
      lastScheduled = roundTick(this.seconds2Ticks(time), 15);
      this.killAllNotes();

      playing = true;
      this.moveToPositionSeconds(time);
      startTime = Rhombus._ctx.currentTime;

      if (this.seconds2Ticks(r.getPosition()) < this.getLoopStart()) {
        loopOverride = true;
      }

      // Force the first round of scheduling
      scheduleNotes();

      // Restart the worker
      scheduleWorker.postMessage({ playing: true });
    };

    r.stopPlayback = function() {
      if (this._disposed || !playing) {
        return;
      }

      playing = false;
      scheduleWorker.postMessage({ playing: false });

      // round the last scheduled tick down to the nearest 16th note
      lastScheduled = this.seconds2Ticks(time);
      lastScheduled = roundTick(lastScheduled, 120);

      this.killAllNotes();

      // round the position down to the nearest 16th note
      var nowTicks = r.seconds2Ticks(getPosition(true));
      nowTicks = roundTick(nowTicks, 120);

      time = r.ticks2Seconds(nowTicks);
    };

    r.loopPlayback = function(nowTicks) {
      var tickDiff = nowTicks - this._song._loopEnd;

      if (tickDiff > 0) {
        console.log("[Rhombus] - Loopback missed loop start by " + tickDiff + " ticks");
        lastScheduled = this._song._loopStart;
        this.moveToPositionTicks(this._song._loopStart, false);
        scheduleNotes();
      }

      this.moveToPositionTicks(this._song._loopStart + tickDiff, false);
      scheduleNotes();
    };

    function getPosition(playing) {
      if (playing) {
        return Rhombus._ctx.currentTime + time;
      } else {
        return time;
      }
    }

    r.getPosTicks = function() {
      var ticks = r.seconds2Ticks(r.getPosition());
      if (r.getLoopEnabled() && ticks < 0) {
        ticks = r.getLoopEnd() + ticks;
      }
      return ticks;
    };

    r.getPosition = function() {
      return getPosition(playing);
    };

    r.getElapsedTime = function() {
      return Rhombus._ctx.currentTime - startTime;
    };

    r.getElapsedTicks = function() {
      return this.seconds2Ticks(this.getElapsedTime());
    };

    r.moveToPositionTicks = function(ticks, override) {
      lastScheduled = ticks;
      var seconds = this.ticks2Seconds(ticks);
      this.moveToPositionSeconds(seconds);

      override = (isDefined(override)) ? override : true;

      if (loopEnabled && override && (ticks > r.getLoopEnd() || ticks < r.getLoopStart())) {
        loopOverride = true;
      }

      if (ticks < r.getLoopEnd() && ticks > r.getLoopStart()) {
        loopOverride = false;
      }
    };

    r.moveToPositionSeconds = function(seconds) {
      if (playing) {
        time = seconds - Rhombus._ctx.currentTime;
      } else {
        time = seconds;
      };
    };

    r.getLoopEnabled = function() {
      return loopEnabled;
    };

    r.setLoopEnabled = function(enabled) {
      loopEnabled = enabled;

      var ticks = r.seconds2Ticks(r.getPosition());
      if (loopEnabled && ticks > r.getLoopEnd()) {
        loopOverride = true;
      }

      if (ticks < r.getLoopEnd() && loopOverride) {
        loopOverride = false;
      }
    };

    r.getLoopStart = function() {
      return this._song._loopStart;
    };

    r.getLoopEnd = function() {
      return this._song._loopEnd;
    };

    r.setLoopStart = function(start) {
      if (notDefined(start) || isNull(start)) {
        console.log("[Rhombus] - Loop start is undefined");
        return undefined;
      }

      if (start >= this._song._loopEnd || (this._song._loopEnd - start) < 480) {
        console.log("[Rhombus] - Invalid loop range");
        return undefined;
      }

      var curPos = r.seconds2Ticks(r.getPosition());

      if (curPos < start) {
        console.log("[Rhombus] - overriding loop enabled");
        loopOverride = true;
      }

      this._song._loopStart = start;
      return this._song._loopStart;
    };

    r.setLoopEnd = function(end) {
      if (notDefined(end) || isNull(end)) {
        console.log("[Rhombus] - Loop end is undefined");
        return undefined;
      }

      if (this._song._loopStart >= end || (end - this._song._loopStart) < 480) {
        console.log("[Rhombus] - Invalid loop range");
        return undefined;
      }

      var curPos = r.seconds2Ticks(r.getPosition());

      if (curPos < this._song._loopEnd && curPos > end) {
        r.moveToPositionTicks(end);
      }

      this._song._loopEnd = end;
      return this._song._loopEnd;
    };

    r.isPlaying = function() {
      return playing;
    };
  };
})(this.Rhombus);
