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
      ctr.prototype.getInterface = getInterface;
      ctr.prototype.getControls = getControls;
      ctr.prototype.getParamMap = getParamMap;
    };

    function trackParams(params) {
      Rhombus._map.mergeInObject(this._currentParams, params, this._unnormalizeMap);
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
      paramValue = +paramValue;
      var setObj = Rhombus._map.generateSetObject(this._unnormalizeMap, paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    }

    function normalizedSetByName(paramName, paramValue) {
      paramValue = +paramValue;
      var setObj = Rhombus._map.generateSetObjectByName(this._unnormalizeMap, paramName, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    }

    function getInterface() {
      // create a container for the controls
      var div = document.createElement("div");

      // create controls for each of the node parameters
      for (var i = 0; i < this.parameterCount(); i++) {
        // paramter range and value stuff
        var value = this.normalizedGet(i);

        // control label
        div.appendChild(document.createTextNode(this.parameterName(i)));

        var ctrl = document.createElement("input");
        ctrl.setAttribute("id",     this.parameterName(i));
        ctrl.setAttribute("name",   this.parameterName(i));
        ctrl.setAttribute("class",  "newSlider");
        ctrl.setAttribute("type",   "range");
        ctrl.setAttribute("min",    0.0);
        ctrl.setAttribute("max",    1.0);
        ctrl.setAttribute("step",   0.01);
        ctrl.setAttribute("value",  value);

        div.appendChild(ctrl);
        div.appendChild(document.createElement("br"));
      }

      return div;
    }

    function getControls(controlHandler) {
      var controls = new Array();
      for (var i = 0; i < this.parameterCount(); i++) {
        controls.push( { id       : this.parameterName(i),
                         target   : this,
                         on       : "input",
                         callback : controlHandler } );
      }

      return controls;
    }

    function getParamMap() {
      var map = {};
      for (var i = 0; i < this.parameterCount(); i++) {
        var param = {
          "name"   : this.parameterName(i),
          "index"  : i,
          "target" : this
        };
        map[this.parameterName(i)] = param;
      }

      return map;
    };

  };
})(this.Rhombus);
