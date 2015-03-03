(function(Rhombus) {
var drumNames = ["Bass #1", "Bass #2", "Clap", "Crash", "Hi-Hat (Closed)", "Hi-Hat (Open)", "Ride", "Rimshot", "Snare #1", "Snare #2", "Tom #1", "Tom #2", "Tom #3"];
Rhombus.drumNames = drumNames;

var drumBuffParsed = JSON.parse(drumBuffStr);
var drumBuffs = [];
for (var i = 0; i < drumBuffParsed.length; i++) {
  var chanDataArr = drumBuffParsed[i];
  var thisBuf = Tone.context.createBuffer(chanDataArr.length, chanDataArr[0].length, 44100);
  for (var j = 0; j < chanDataArr.length; j++) {
    var parsedData = chanDataArr[j];
    var data = thisBuf.getChannelData(j);
    for (var k = 0; k < parsedData.length; k++) {
      data[k] = parsedData[k];
    }
  }
  drumBuffs.push(thisBuf);
}

Rhombus.drumBuffers = drumBuffs;

})(this.Rhombus);