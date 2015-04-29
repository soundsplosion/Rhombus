//! rhombus.param.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus._addParamFunctions = function(ctr) {
  function trackParams(params) {
    Rhombus._map.mergeInObject(this._currentParams, params, this._unnormalizeMap);
  }
  ctr.prototype._trackParams = trackParams;

  function parameterCount() {
    return Rhombus._map.subtreeCount(this._unnormalizeMap);
  }
  ctr.prototype.parameterCount = parameterCount;

  function parameterName(paramIdx) {
    var name = Rhombus._map.getParameterName(this._unnormalizeMap, paramIdx);
    if (typeof name !== "string") {
      return;
    }
    return name;
  }
  ctr.prototype.parameterName = parameterName;

  function parameterDisplayString(paramIdx) {
    return this.parameterDisplayStringByName(this.parameterName(paramIdx));
  }
  ctr.prototype.parameterDisplayString = parameterDisplayString;

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

    if (isNumber(curValue)) {
      displayValue = Math.round(curValue * 1000) / 1000;
    }

    var disp = Rhombus._map.getDisplayFunctionByName(this._unnormalizeMap, paramName);
    return disp(displayValue);
  }
  ctr.prototype.parameterDisplayStringByName = parameterDisplayStringByName;

  function normalizedGet(paramIdx) {
    return Rhombus._map.getParameterValue(this._currentParams, paramIdx);
  }
  ctr.prototype.normalizedGet = normalizedGet;

  function normalizedGetByName(paramName) {
    return Rhombus._map.getParameterValueByName(this._currentParams, paramName);
  }
  ctr.prototype.normalizedGetByName = normalizedGetByName;

  function normalizedSet(paramIdx, paramValue) {
    paramValue = +paramValue;
    var setObj = Rhombus._map.generateSetObject(this._unnormalizeMap, paramIdx, paramValue);
    if (typeof setObj !== "object") {
      return;
    }
    this._normalizedObjectSet(setObj);
  }
  ctr.prototype.normalizedSet = normalizedSet;

  function normalizedSetByName(paramName, paramValue) {
    paramValue = +paramValue;
    var setObj = Rhombus._map.generateSetObjectByName(this._unnormalizeMap, paramName, paramValue);
    if (typeof setObj !== "object") {
      return;
    }
    this._normalizedObjectSet(setObj);
  }
  ctr.prototype.normalizedSetByName = normalizedSetByName;

  function getInterface() {
    // create a container for the controls
    var div = document.createElement("div");

    var newLevel = false;
    var levelString = "";

    // create controls for each of the node parameters
    for (var i = 0; i < this.parameterCount(); i++) {
      // paramter range and value stuff
      var value = this.normalizedGet(i);

      // tokenize the parameter name
      var paramName = this.parameterName(i);
      var tokens = paramName.split(":");

      // create header labels for each parameter group
      if (tokens.length > 1) {
        if (levelString !== tokens[0]) {
          // keep track of the top-level parameter group
          levelString = tokens[0];

          // create a container for the group label
          var levelDiv = document.createElement("div");
          var label = document.createTextNode(tokens[0].toUpperCase());

          // style the label
          levelDiv.style.textAlign = "center";
          levelDiv.appendChild(document.createElement("b"));

          // append the elements
          levelDiv.appendChild(document.createElement("br"));
          levelDiv.appendChild(label);
          levelDiv.appendChild(document.createElement("br"));
          div.appendChild(levelDiv);
        }
      }

      // control label
      div.appendChild(document.createTextNode(tokens[tokens.length - 1]));

      var ctrl = document.createElement("input");
      ctrl.setAttribute("id",     paramName);
      ctrl.setAttribute("name",   paramName);
      ctrl.setAttribute("class",  "newSlider");
      ctrl.setAttribute("type",   "range");
      ctrl.setAttribute("min",    0.0);
      ctrl.setAttribute("max",    1.0);
      ctrl.setAttribute("step",   0.01);
      ctrl.setAttribute("value",  value);

      div.appendChild(ctrl);

      var valueSpan = document.createElement("span");
      valueSpan.setAttribute("class", "valueSpan");
      valueSpan.setAttribute("name",  "paramValue_" + i);
      valueSpan.setAttribute("id",    "paramValue_" + i);
      valueSpan.innerHTML = this.parameterDisplayString(i);
      div.appendChild(valueSpan);

      div.appendChild(document.createElement("br"));
    }

    if (this._type === "scpt") {
      var button = document.createElement("input");
      button.setAttribute("id", "codeButton");
      button.setAttribute("name", "codeButton");
      button.setAttribute("class", "codeButton");
      button.setAttribute("type", "button");
      button.setAttribute("value", "Change Code");
      div.appendChild(button);
      div.appendChild(document.createElement("br"));
    }

    // For spacing
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createElement("br"));

    return div;
  }
  ctr.prototype.getInterface = getInterface;

  function getControls(controlHandler) {
    var that = this;
    var controls = new Array();
    for (var i = 0; i < this.parameterCount(); i++) {
      controls.push( { id       : this.parameterName(i),
                       target   : this,
                       on       : "input",
                       callback : controlHandler } );
    }

    function scriptHandler() {
      var editorArea = document.createElement("textarea");
      editorArea.id = "scriptEditor";
      editorArea.value = that.getCode();
      editorArea.cols = 60;
      editorArea.rows = 20;
      editorArea.spellcheck = false;

      function okClicked() {
        var code = editorArea.value;
        that.setCode(code);
      }

      function cancelClicked() {
        // Do nothing
      }

      var params = {};
      params.detail = {};
      params.detail.type = 'okcancel';
      params.detail.caption = 'Edit Code';
      params.detail.message = 'message';
      params.detail.okButton = 'Save Changes';
      params.detail.okHandler = okClicked;
      params.detail.cancelButton = 'Discard Changes';
      params.detail.cancelHandler = cancelClicked;
      params.detail.inescapable = true;
      params.detail.htmlNode = editorArea;
      var dialogEvent = new CustomEvent("denoto-dialogbox", params);
      document.dispatchEvent(dialogEvent);
    }

    if (this._type === "scpt") {
      controls.push( { id       : "codeButton",
                       target   : this,
                       on       : "click",
                       callback : scriptHandler } );
    }

    return controls;
  }
  ctr.prototype.getControls = getControls;

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
  ctr.prototype.getParamMap = getParamMap;
};
