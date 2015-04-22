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

      function log() {
        console.log.apply(console, Array.prototype.slice.call(arguments, 0));
      }

      this._M = {
        channelCount: 0,
        sampleCount: 0,
        input: input,
        output: output,
        setProcessor: setProcessor,
        log: log
      };

      this._tamedM = undefined;
      this._processor = undefined;

      var that = this;
      this._processorNode = r._ctx.createScriptProcessor(4096, 1, 1);
      this._processorNode.onaudioprocess = function(ae) {
        if (that._processor) {
/*          that._inp = ae.inputBuffer;
          that._out = ae.outputBuffer;
          that._M.channelCount = that._inp.numberOfChannels;
          that._M.sampleCount = that._inp.getChannelData(0).length;
          that._processor();*/
          that._processor(ae);
        } else {
          // The default processor is just a pass-through.
          var inp = ae.inputBuffer;
          var out = ae.outputBuffer;
          for (var chan = 0; chan < inp.numberOfChannels; chan++) {
            var inpData = inp.getChannelData(chan);
            var outData = out.getChannelData(chan);
            for (var samp = 0; samp < inpData.length; samp++) {
              outData[samp] = inpData[samp];
            }
          }
        }
      };

      this.connectEffect(this._processorNode);
    }
    Tone.extend(script, Tone.Effect);
    r._Script = script;

    script.prototype.setCode = function(str) {
      eval('this._processor = ' + str);
      /*
      var that = this;
      caja.load(undefined, undefined, function(frame) {
        if (!that._tamedM) {
          caja.markReadOnlyRecord(that._M);
          caja.markFunction(that._M.input);
          caja.markFunction(that._M.output);
          caja.markFunction(that._M.setProcessor);
          caja.markFunction(that._M.log);
          that._tamedM = caja.tame(that._M);
        }

        frame.code(undefined, 'text/javascript', str)
        .api({
          M: that._tamedM
        })
        .run();
      });
      */
    };
    r._addEffectFunctions(script);

    script.prototype._unnormalizeMap = r._makeEffectMap({});
    script.prototype.displayName = function() {
      return "Script";
    };

  };
})(this.Rhombus);
