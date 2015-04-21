//! rhombus.effect.script.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {
  Rhombus._scriptEffectSetup = function(r) {

    function script() {
      Tone.Effect.call(this);

      var that = this;
      function input(chanIdx, sampIdx) {
        return that._inp.getChannelData(chanIdx)[sampIdx];
      }

      function output(chanIdx, sampIdx, value) {
        that._out.getChannelData(chanIdx)[sampIdx] = value;
      }

      function setProcessor(f) {
        that._processor = f;
      }

      this._M = {
        channelCount: 0,
        sampleCount: 0,
        input: input,
        output: output,
        setProcessor: setProcessor
      };

      this._tamedM = undefined;

      var that = this;
      this._processorNode = r._ctx.createScriptProcessor(4096, 1, 1);
      this._processorNode.onaudioprocess = function(ae) {
        if (that._processor) {
          that._inp = ae.inputBuffer;
          that._out = ae.outputBuffer;
          that._M.channelCount = s.inp.numberOfChannels;
          that._M.sampleCount = s.inp.getChannelData(0).length;
          that._processor();
        } else {
          // The default processor just zeros out the buffers.
          var out = ae.outputBuffer;
          for (var chan = 0; chan < out.numberOfChannels; chan++) {
            var outData = out.getChannelData(chan);
            for (var samp = 0; samp < outData.length; samp++) {
              outData[samp] = 0;
            }
          }
        }
      };

      this.connectEffect(processor);
    }
    Tone.extend(script, Tone.Effect);
    r._Script = script;

    script.prototype.setCode = function(str) {
      var that = this;
      caja.load(undefined, undefined, function(frame) {
        if (that.tamedM) {
          caja.markReadOnlyRecord(that.M);
          caja.markFunction(that.M.input);
          caja.markFunction(that.M.output);
          caja.markFunction(that.M.setProcessor);
          that.tamedM = caja.tame(that.M);
        }

        frame.code(undefined, 'text/javascript', str)
        .api({
          M: that.tamedM
        })
        .run();
      });
    };
    r._addEffectFunctions(script);

    script.prototype._unnormalizeMap = r._makeEffectMap({});
    script.prototype.displayName = function() {
      return "Script";
    };

  };
})(this.Rhombus);
