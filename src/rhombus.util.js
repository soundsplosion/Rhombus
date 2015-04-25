//! rhombus.util.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  Rhombus.Util = {};

  window.isDefined = function(obj) {
    return typeof obj !== "undefined";
  };

  window.notDefined = function(obj) {
    return typeof obj === "undefined";
  };

  window.isObject = function(obj) {
    return typeof obj === "object";
  };

  window.notObject = function(obj) {
    return typeof obj !== "object";
  };

  window.isInteger = function(obj) {
    return Math.round(obj) === obj;
  };

  window.notInteger = function(obj) {
    return !(window.isInteger(obj));
  };

  window.isNumber = function(obj) {
    return typeof obj === "number";
  }

  window.notNumber = function(obj) {
    return typeof obj !== "number";
  }

  window.isNull = function(obj) {
    return obj === null;
  };

  window.notNull = function(obj) {
    return obj !== null;
  };

  window.quantizeTick = function(tickVal, quantize) {
    if ((tickVal % quantize) > (quantize / 2)) {
      return (Math.floor(tickVal/quantize) * quantize) + quantize;
    }
    else {
      return Math.floor(tickVal/quantize) * quantize;
    }
  };

  window.roundTick = function(tickVal, quantize) {
    return Math.floor(tickVal/quantize) * quantize;
  };

  window.ticksToMusicalTime = function(ticks) {
    if (notDefined(ticks)) {
      return undefined;
    }

    var jsonTime = {
      "bar"     : 1 + Math.floor(ticks/1920),
      "beat"    : 1 + Math.floor(ticks/480)%4,
      "qtrBeat" : 1 + Math.floor(ticks/120)%4,
      "ticks"   : Math.floor(ticks%120)
    };

    return jsonTime;
  }

  window.ticksToMusicalValue = function(ticks) {
    if (notDefined(ticks)) {
      return undefined;
    }

    var jsonTime = {
      "bar"     : Math.floor(ticks/1920),
      "beat"    : Math.floor(ticks/480)%4,
      "qtrBeat" : Math.floor(ticks/120)%4,
      "ticks"   : Math.floor(ticks%120)
    };

    return jsonTime;
  }

  window.musicalTimeToTicks = function(time) {
    if (notDefined(time)) {
      return undefined;
    }

    var barTicks  = (time["bar"] - 1) * 1920;
    var beatTicks = (time["beat"] - 1) * 480;
    var qtrBeatTicks = (time["qtrBeat"] - 1) * 120;

    return (barTicks + beatTicks + qtrBeatTicks + time["ticks"]);
  };

  window.stringToTicks = function(timeString, isPos) {
    var bar = 0;
    var beat = 0;
    var qtrBeat = 0;
    var ticks = 0;

    var tokens = timeString.split(/(\D+)/);
    var parsed = new Array(4);

    var offset = (isDefined(isPos) && isPos) ? 1 : 0;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      // handle even tokens
      if (((i + 1) % 2) == 1) {
        if (isInteger(+token) && +token >= 0) {
          parsed[Math.floor(i/2)] = +token - offset;
        }
        else {
          return undefined;
        }
      }
      // odd tokens must be a single period
      else {
        if (token !== '.') {
          return undefined;
        }
      }
    }

    var ticks = 0;

    if (isDefined(parsed[0])) {
      ticks += parsed[0] * 1920;
    }

    if (isDefined(parsed[1])) {
      ticks += parsed[1] * 480;
    }

    if (isDefined(parsed[2])) {
      ticks += parsed[2] * 120;
    }

    if (isDefined(parsed[3])) {
      ticks += parsed[3] + offset;
    }

    return ticks;
  };

  window.intToHexByte = function(val) {
    if (!isInteger(+val) || +val < 0 || +val > 255) {
      return undefined;
    }

    return ("00" + val.toString(16)).substr(-2);
  };

  window.intToBytes = function(val) {
    return [ (val >> 24) & 0xFF,
             (val >> 16) & 0xFF,
             (val >>  8) & 0xFF,
             (val      ) & 0xFF ];
  };

  // Converts an integer value to a variable-length base-128 array
  window.intToVlv = function(val) {
    if (!isInteger(val) || val < 0) {
      console.log("[Rhombus] - input must be a positive integer");
      return undefined;
    }

    var chunks = [];

    for (var i = 0; i < 4; i++) {
      chunks.push(val & 0x7F);
      val = val >> 7;
    }

    chunks.reverse();

    var leading = true;
    var leadingCount = 0;

    // set the MSB on the non-LSB bytes
    for (var i = 0; i < 3; i++) {
      // keep track of the number of leading 'digits'
      if (leading && chunks[i] == 0) {
        leadingCount++;
      }
      else {
        leading = false;
      }
      chunks[i] = chunks[i] | 0x80;
    }

    // trim the leading zeros
    chunks.splice(0, leadingCount);

    return chunks;
  }

  // Converts a variable-length value back to an integer
  window.vlvToInt = function(vlv) {
    if (!(vlv instanceof Array)) {
      console.log("[Rhombus] - input must be an integer array");
      return undefined;
    }

    var val = 0;
    var shftAmt = 7 * (vlv.length - 1);
    for (var i = 0; i < vlv.length - 1; i++) {
      val |= (vlv[i] & 0x7F) << shftAmt;
      shftAmt -= 7;
    }

    val |= vlv[vlv.length - 1];

    if (!isInteger(val)) {
      console.log("[Rhombus] - invalid input");
      return undefined;
    }

    return val;
  }

  // src: http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
  window.hsvToRgb = function(h, s, v) {
    var h_i = Math.floor(h * 6);
    var f = (h * 6) - h_i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    var r, g, b;

    if (h_i == 0) {
      r = v;
      g = t;
      b = p;
    }
    else if (h_i == 1) {
      r = q;
      g = v;
      b = p;
    }
    else if (h_i == 2) {
      r = p;
      g = v;
      b = t;
    }
    else if (h_i == 3) {
      r = p;
      g = q;
      b = v;
    }
    else if (h_i == 4) {
      r = t;
      g = p;
      b = v;
    }
    else if (h_i == 5) {
      r = v;
      g = p;
      b = q;
    }

    r = Math.floor(r*256);
    g = Math.floor(g*256);
    b = Math.floor(b*256);

    return (intToHexByte(r) + intToHexByte(g) + intToHexByte(b));
  }

  var h = Math.random();
  window.getRandomColor = function() {
    h += 0.618033988749895; // golden ratio conjugate
    h %= 1;

    return "#" + hsvToRgb(h, 0.5, 0.95).toUpperCase();
  }

  Rhombus.Util.clampMinMax = function(val, min, max) {
    return (val < min) ? min : (val > max) ? max : val;
  }

  Rhombus.Util.deepCopy = function(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function calculator(noteNum) {
    return Math.pow(2, (noteNum-69)/12) * 440;
  }

  var table = [];
  for (var i = 0; i <= 127; i++) {
    table[i] = calculator(i);
  }

  // Converts a note-number (typical range 0-127) into a frequency value
  Rhombus.Util.noteNum2Freq = function(noteNum) {
    return table[noteNum];
  }

  function IdSlotContainer(slotCount) {
    this._slots = [];
    this._map = {};
    this._count = slotCount;
  }

  IdSlotContainer.prototype.getById = function(id) {
    id = +id;
    if (id in this._map) {
      return this._map[id];
    } else {
      return undefined;
    }
  };

  IdSlotContainer.prototype.addObj = function(obj, idx) {
    var id = obj._id;
    if (id in this._map) {
      return undefined;
    }

    if (this._slots.length === this._count) {
      return undefined;
    }

    if (notNumber(idx)) {
      idx = this._slots.length;
    }

    if (idx < 0 || idx >= this._count) {
      return undefined;
    }

    this._slots.splice(idx, 0, id);
    this._map[id] = obj;
    return obj;
  };

  IdSlotContainer.prototype.removeId = function(id) {
    id = +id;

    if (!(id in this._map)) {
      return;
    }

    for (var idx = 0; idx < this._slots.length; idx++) {
      if (this._slots[idx] === id) {
        this._slots.splice(idx, 1);
        break;
      }
    }

    var toRet = this._map[id];
    delete this._map[id];
    return toRet;
  };

  IdSlotContainer.prototype.removeObj = function(obj) {
    return this.removeId(obj._id);
  };

  IdSlotContainer.prototype.getIdBySlot = function(idx) {
    if (idx >= 0 && idx < this._count) {
      return this._slots[idx];
    } else {
      return undefined;
    }
  };

  IdSlotContainer.prototype.getObjBySlot = function(idx) {
    return this.getObjById(this.getIdBySlot(idx));
  };

  IdSlotContainer.prototype.getObjById = function(id) {
    return this._map[+id];
  };

  IdSlotContainer.prototype.getSlotByObj = function(obj) {
    return getSlotById(obj._id);
  };

  IdSlotContainer.prototype.getSlotById = function(id) {
    for (var i = 0; i < this._slots.length; i++) {
      if (this._slots[i] === id) {
        return i;
      }
    }

    return -1;
  };

  IdSlotContainer.prototype.swapSlots = function(idx1, idx2) {
    if (idx1 >= 0 && idx1 < this._count && idx2 >= 0 && idx2 < this._count) {
      var from1 = this._slots[idx1];
      this._slots[idx1] = this._slots[idx2];
      this._slots[idx2] = from1;
    }
  };

  IdSlotContainer.prototype.moveSlot = function(oldIdx, newIdx) {
    if (oldIdx >= 0 && oldIdx < this._count && newIdx >= 0 && newIdx < this._count && oldIdx !== newIdx) {
      var obj = this._slots.splice(oldIdx, 1)[0];
      this._slots[newIdx].splice(newIdx, 0, obj);
    }
  };

  IdSlotContainer.prototype.isFull = function() {
    return this._slots.length === this._count;
  };

  IdSlotContainer.prototype.length = function () {
    return this._slots.length;
  };

  IdSlotContainer.prototype.objIds = function() {
    return Object.keys(this._map).map(function(x) { return +x; });
  };

  Rhombus.Util.IdSlotContainer = IdSlotContainer;

  Rhombus._map = {};

  // Common mapping styles.
  // mapIdentity: maps x to x.
  Rhombus._map.mapIdentity = function(x) {
    return x;
  }
  // mapLinear(x, y): maps [0,1] linearly to [x,y].
  Rhombus._map.mapLinear = function(x, y) {
    function mapper(t) {
      return x + t*(y-x);
    }
    return mapper;
  }
  // mapExp(x, y): maps [0,1] exponentially to [x,y].
  // x, y should both be strictly positive.
  Rhombus._map.mapExp = function(x, y) {
    var c0 = x;
    var c1 = Math.log(y / x);
    function mapper(t) {
      return c0*Math.exp(c1*t);
    }
    return mapper;
  }
  // mapLog(x, y): maps [0,1] logarithmically to [x,y].
  // Really, it maps [smallvalue, 1] logarithmically to [x,y]
  // because log functions aren't defined at 0.
  Rhombus._map.mapLog = function(x, y) {
    var threshold = 0.0001;
    var logc1, c1, c0;
    if (y === 0) {
      c1 = 1;
      c0 = x / Math.log(threshold);
    } else {
      logc1 = Math.log(threshold) / ((x/y) - 1);
      c1 = Math.exp(logc1);
      c0 = y / logc1;
    }

    function mapper(t) {
      if (t < threshold) {
        t = threshold;
      }
      return c0*Math.log(c1*t);
    }
    return mapper;
  }
  // mapDiscrete(arg1, ...): divides [0,1] into equal-sized
  // boxes, with each box mapping to an argument.
  Rhombus._map.mapDiscrete = function() {
    var maxIdx = arguments.length-1;
    var binSize = 1.0 / arguments.length;
    var args = arguments;
    function mapper(t) {
      var idx = Math.floor(t / binSize);
      if (idx >= maxIdx) {
        idx = maxIdx;
      }
      return args[idx];
    }
    return mapper;
  }

  Rhombus._map.mergeInObject = function(base, toAdd, allowed) {
    if (typeof toAdd !== "object") {
      return;
    }

    if (typeof allowed !== "object") {
      return;
    }

    var addKeys = Object.keys(toAdd);
    for (var idx in addKeys) {
      var key = addKeys[idx];
      var value = toAdd[key];

      if (isNull(value) || notDefined(value)) {
        continue;
      }

      if (!(key in allowed)) {
        continue;
      }

      var allowedValue = allowed[key];
      var newIsObj = typeof value === "object";
      var allowedIsObj = typeof allowedValue === "object";
      if (newIsObj && allowedIsObj) {
        if (!(key in base)) {
          base[key] = {};
        }
        Rhombus._map.mergeInObject(base[key], value, allowedValue);
      } else {
        base[key] = value;
      }
    }
  };

  Rhombus._map.subtreeCount = function(obj) {
    var count = 0;
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (!Array.isArray(value)) {
        count += Rhombus._map.subtreeCount(value);
      } else {
        count += 1;
      }
    }
    return count;
  };

  Rhombus._map.unnormalizedParams = function(params, unnormalizeMap) {
    if (isNull(params) || notDefined(params) ||
        typeof(params) !== "object") {
      return params;
    }

    function unnormalized(obj, thisLevelMap) {
      var returnObj = {};
      var keys = Object.keys(obj);
      for (var idx in keys) {
        var key = keys[idx];
        var value = obj[key];
        if (typeof value === "object") {
          var nextLevelMap = thisLevelMap[key];
          returnObj[key] = unnormalized(value, nextLevelMap);
        } else {
          if (isDefined(thisLevelMap)) {
            var entry = thisLevelMap[key];
            if (isDefined(entry) && isDefined(entry[0])) {
              var ctrXformer = entry[0];
              returnObj[key] = ctrXformer(value);
            }
          } else {
            returnObj[key] = value;
          }
        }
      }
      return returnObj;
    }

    return unnormalized(params, unnormalizeMap);
  };

  Rhombus._map.getParameterValue = function(obj, leftToCount) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (!isNumber(value)) {
        var value = Rhombus._map.getParameterValue(value, leftToCount);
        if (value < -0.5) {
          leftToCount = (-1)*(value+1);
        } else {
          return value;
        }
      } else if (leftToCount === 0) {
        return value;
      } else {
        leftToCount -= 1;
      }
    }
    return (-1)*(leftToCount+1);
  };

  Rhombus._map.getParameterValueByName = function(obj, name) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (name.substring(0, key.length) == key) {
        if (name.length == key.length) {
          return value;
        } else if (name[key.length] == ':') {
          // We matched the first part of the name
          var newName = name.substring(key.length+1);
          var generated = Rhombus._map.getParameterValueByName(value, newName);
          if (notDefined(generated)) {
            return;
          } else {
            return generated;
          }
        }
      }
    }
  };

  Rhombus._map.generateSetObject = function(obj, leftToCount, paramValue) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (!Array.isArray(value)) {
        var generated = Rhombus._map.generateSetObject(value, leftToCount, paramValue);
        if (typeof generated === "object") {
          var toRet = {};
          toRet[key] = generated;
          return toRet;
        } else {
          leftToCount = generated;
        }
      } else if (leftToCount === 0) {
        var toRet = {};
        toRet[key] = paramValue;
        return toRet;
      } else {
        leftToCount -= 1;
      }
    }
    return leftToCount;
  };

  Rhombus._map.generateSetObjectByName = function(obj, name, paramValue) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (name.substring(0, key.length) === key) {
        if (name.length === key.length) {
          var toRet = {};
          toRet[key] = paramValue;
          return toRet;
        } else if (name[key.length] === ':') {
          // We matched the first part of the name
          var newName = name.substring(key.length+1);
          var generated = Rhombus._map.generateSetObjectByName(value, newName, paramValue);
          if (typeof generated === "object") {
            var toRet = {};
            toRet[key] = generated;
            return toRet;
          } else {
            return;
          }
        }
      }
    }
  };

  Rhombus._map.getParameterName = function(obj, leftToCount) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (!Array.isArray(value)) {
        var name = Rhombus._map.getParameterName(value, leftToCount);
        if (typeof name === "string") {
          return key + ":" + name;
        } else {
          leftToCount = name;
        }
      } else if (leftToCount === 0) {
        return key;
      } else {
        leftToCount -= 1;
      }
    }
    return leftToCount;
  };

  Rhombus._map.getDisplayFunctionByName = function(obj, name) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (name.substring(0, key.length) === key) {
        if (name.length === key.length) {
          return value[1];
        } else if (name[key.length] === ':') {
          // We matched the first part of the name
          var newName = name.substring(key.length+1);
          return Rhombus._map.getDisplayFunctionByName(value, newName);
        }
      }
    }
  };

  Rhombus._map.generateDefaultSetObj = function(obj) {
    var keys = Object.keys(obj);
    var toRet = {};
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (!Array.isArray(value)) {
        toRet[key] = Rhombus._map.generateDefaultSetObj(value);
      } else {
        if (isDefined(value[2])) {
          toRet[key] = value[2];
        }
      }
    }
    return toRet;
  };

  // Frequently used mappings.
  // TODO: fix envelope function mappings
  Rhombus._map.timeMapFn = Rhombus._map.mapExp(0.001, 10);
  Rhombus._map.freqMapFn = Rhombus._map.mapExp(1, 22100);
  Rhombus._map.cutoffMapFn = Rhombus._map.mapExp(25, 22100);
  Rhombus._map.lowFreqMapFn = Rhombus._map.mapExp(1, 100);
  Rhombus._map.exponentMapFn = Rhombus._map.mapExp(0.1, 10);
  Rhombus._map.harmMapFn = Rhombus._map.mapLinear(-2000, 2000);

  function secondsDisplay(v) {
    return v + " s";
  }
  Rhombus._map.secondsDisplay = secondsDisplay;

  function dbDisplay(v) {
    return v + " dB";
  }
  Rhombus._map.dbDisplay = dbDisplay;

  function rawDisplay(v) {
    return v + "";
  }
  Rhombus._map.rawDisplay = rawDisplay;

  function hzDisplay(v) {
    return v + " Hz";
  }
  Rhombus._map.hzDisplay = hzDisplay;

  Rhombus._map.envelopeMap = {
    "attack"   : [Rhombus._map.timeMapFn,   secondsDisplay, 0.0],
    "decay"    : [Rhombus._map.timeMapFn,   secondsDisplay, 0.25],
    "sustain"  : [Rhombus._map.mapIdentity, rawDisplay,     1.0],
    "release"  : [Rhombus._map.timeMapFn,   secondsDisplay, 0.0],
  };

  Rhombus._map.synthFilterMap = {
    "type" : [Rhombus._map.mapDiscrete("lowpass", "bandpass", "highpass", "notch"),
              rawDisplay, 0],
    "frequency" : [Rhombus._map.cutoffMapFn, hzDisplay, 1.0],
    "Q" : [Rhombus._map.mapLinear(1, 15), rawDisplay, 0],
    "gain" : [Rhombus._map.mapIdentity, rawDisplay, 0]
  };

  Rhombus._map.filterMap = {
    "type" : [Rhombus._map.mapDiscrete("lowpass", "bandpass", "highpass", "notch",
                                       "lowshelf", "highshelf", "peaking"), rawDisplay, 0],
    "frequency" : [Rhombus._map.cutoffMapFn, hzDisplay, 1.0],
    "Q" : [Rhombus._map.mapLinear(1, 15), rawDisplay, 0],
    "gain" : [Rhombus._map.mapIdentity, rawDisplay, 0]
  };

  Rhombus._map.filterEnvelopeMap = {
    "attack"   : [Rhombus._map.timeMapFn,   secondsDisplay, 0.0],
    "decay"    : [Rhombus._map.timeMapFn,   secondsDisplay, 0.5],
    "sustain"  : [Rhombus._map.mapIdentity, rawDisplay,     0.0],
    "release"  : [Rhombus._map.timeMapFn,   secondsDisplay, 0.25],
    "min"      : [Rhombus._map.cutoffMapFn, hzDisplay,      0.0],
    "max"      : [Rhombus._map.cutoffMapFn, hzDisplay,      0.0],
  };

})(this.Rhombus);
