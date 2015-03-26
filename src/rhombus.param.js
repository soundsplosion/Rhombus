//! rhombus.param.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._paramSetup = function(r) {

    r._addParamFunctions = function(ctr) {
      ctr.prototype._trackParams = trackParams;
      ctr.prototype.parameterCount = parameterCount;
      ctr.prototype.parameterName = parameterName;
      ctr.prototype.parameterDisplayString = parameterDisplayString;
      ctr.prototype.parameterDisplayStringByName = parameterDisplayStringByName;
      ctr.prototype.normalizedGet = normalizedGet;
      ctr.prototype.normalizedGetByName = normalizedGetByName;
      ctr.prototype.normalizedSet = normalizedSet;
      ctr.prototype.normalizedSetByName = normalizedSetByName;
    };

    function trackParams(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    }

    function parameterCount() {
      return Rhombus._map.subtreeCount(this._unnormalizeMap);
    }

    function parameterName(paramIdx) {
      var name = Rhombus._map.getParameterName(this._unnormalizeMap, paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    }

    function parameterDisplayString(paramIdx) {
      return this.parameterDisplayStringByName(this.parameterName(paramIdx));
    }

    function parameterDisplayStringByName(paramName) {
      var pieces = paramName.split(":");

      var curValue = this._currentParams;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var setObj = Rhombus._map.generateSetObjectByName(this._unnormalizeMap, paramName, curValue);
      var realObj = Rhombus._map.unnormalizedParams(setObj, this._unnormalizeMap);

      curValue = realObj;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var displayValue = curValue;
      var disp = Rhombus._map.getDisplayFunctionByName(this._unnormalizeMap, paramName);
      return disp(displayValue);
    }

    function normalizedGet(paramIdx) {
      return Rhombus._map.getParameterValue(this._currentParams, paramIdx);
    }

    function normalizedGetByName(paramName) {
      return Rhombus._map.getParameterValueByName(this._currentParams, paramName);
    }

    function normalizedSet(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(this._unnormalizeMap, paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    }

    function normalizedSetByName(paramName, paramValue) {
      var setObj = Rhombus._map.generateSetObjectByName(this._unnormalizeMap, paramName, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    }

  };
})(this.Rhombus);
