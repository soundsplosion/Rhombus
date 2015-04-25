//! rhombus.effect.script.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
Rhombus._Script = function() {
  Tone.Effect.call(this);

  var that = this;
  function inputSamples(chanIdx) {
    return that._inp.getChannelData(chanIdx);
  }

  function setProcessor(f) {
    that._processor = f;
  }

  function log() {
    console.log.apply(console, Array.prototype.slice.call(arguments, 0));
  }

  this._M = {
    channelCount: 0,
    inputSamples: inputSamples,
    setProcessor: setProcessor,
    log: log
  };

  this._tamedM = undefined;
  this._processor = undefined;

  var that = this;
  this._processorNode = Rhombus._ctx.createScriptProcessor(4096, 1, 1);
  this._processorNode.onaudioprocess = function(ae) {
    if (that._processor) {
      that._inp = ae.inputBuffer;
      that._M.channelCount = that._inp.numberOfChannels;
      var processed = that._processor();
      var out = ae.outputBuffer;
      for (var chan = 0; chan < out.numberOfChannels; chan++) {
        var processedData = processed[chan];
        var outData = out.getChannelData(chan);
        for (var samp = 0; samp < outData.length; samp++) {
          outData[samp] = processedData[samp];
        }
      }
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
};
Tone.extend(Rhombus._Script, Tone.Effect);

Rhombus._Script.prototype.setCode = function(str) {
  var that = this;
  caja.load(undefined, undefined, function(frame) {
    if (!that._tamedM) {
      caja.markReadOnlyRecord(that._M);
      caja.markFunction(that._M.inputSamples);
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
};
Rhombus._addEffectFunctions(Rhombus._Script);

Rhombus._Script.prototype._unnormalizeMap = Rhombus._makeEffectMap({});
Rhombus._Script.prototype.displayName = function() {
  return "Script";
};
