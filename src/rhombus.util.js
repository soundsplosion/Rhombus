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

  // src: http://stackoverflow.com/questions/1484506/random-color-generator-in-javascript
  window.getRandomColor = function() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  function calculator(noteNum) {
    return Math.pow(2, (noteNum-69)/12) * 440;
  }

  var table = [];
  for (var i = 0; i < 127; i++) {
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

  IdSlotContainer.prototype.isFull = function() {
    return this._slots.length === this._count;
  };

  IdSlotContainer.prototype.length = function () {
    return this._slots.length;
  };

  IdSlotContainer.prototype.objIds = function() {
    return Object.keys(this._map);
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

  Rhombus._map.mergeInObject = function(base, toAdd) {
    if (typeof toAdd !== "object") {
      return;
    }

    var addKeys = Object.keys(toAdd);
    for (var idx in addKeys) {
      var key = addKeys[idx];
      var value = toAdd[key];

      if (isNull(value) || notDefined(value)) {
        continue;
      }

      if (key in base) {
        var oldValue = base[key];
        if (typeof oldValue === "object" && typeof value === "object") {
          Rhombus._map.mergeInObject(base[key], value);
        } else {
          base[key] = value;
        }
      } else {
        base[key] = value;
      }
    }
  }

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

  Rhombus._map.unnormalizedParams = function(params, type, unnormalizeMaps) {
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
          var ctrXformer = isDefined(thisLevelMap) ? thisLevelMap[key][0] : undefined;
          if (isDefined(ctrXformer)) {
            returnObj[key] = ctrXformer(value);
          } else {
            returnObj[key] = value;
          }
        }
      }
      return returnObj;
    }

    return unnormalized(params, unnormalizeMaps[type]);
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
  Rhombus._map.lowFreqMapFn = Rhombus._map.mapExp(1, 100);
  Rhombus._map.exponentMapFn = Rhombus._map.mapExp(0.1, 10);
  Rhombus._map.harmMapFn = Rhombus._map.mapLinear(-1000, 1000);

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
    "attack"   : [Rhombus._map.timeMapFn,     secondsDisplay, 0.0],
    "decay"    : [Rhombus._map.timeMapFn,     secondsDisplay, 0.25],
    "sustain"  : [Rhombus._map.mapIdentity,   rawDisplay,     1.0],
    "release"  : [Rhombus._map.timeMapFn,     secondsDisplay, 0.0],
    "exponent" : [Rhombus._map.exponentMapFn, rawDisplay,     0.5]
  };

  Rhombus._map.filterMap = {
    "type" : [Rhombus._map.mapDiscrete("lowpass", "highpass", "bandpass", "lowshelf",
                         "highshelf", "peaking", "notch", "allpass"), rawDisplay, 0],
    "frequency" : [Rhombus._map.freqMapFn, hzDisplay, 1.0],
    "rolloff" : [Rhombus._map.mapDiscrete(-12, -24, -48), dbDisplay, 0.5],
    // TODO: verify this is good
    "Q" : [Rhombus._map.mapLinear(1, 15), rawDisplay, 0],
    // TODO: verify this is good
    "gain" : [Rhombus._map.mapIdentity, rawDisplay, 0]
  };

  Rhombus._map.filterEnvelopeMap = {
    "attack"   : [Rhombus._map.timeMapFn,     secondsDisplay, 0.0],
    "decay"    : [Rhombus._map.timeMapFn,     secondsDisplay, 0.5],
    "sustain"  : [Rhombus._map.timeMapFn,     rawDisplay,     0.0],
    "release"  : [Rhombus._map.timeMapFn,     secondsDisplay, 0.25],
    "min" : [Rhombus._map.freqMapFn, hzDisplay, 0.0],
    "max" : [Rhombus._map.freqMapFn, hzDisplay, 0.0],
    "exponent" : [Rhombus._map.exponentMapFn, rawDisplay, 0.5]
  };

})(this.Rhombus);
