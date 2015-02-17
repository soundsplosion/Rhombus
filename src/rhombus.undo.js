//! rhombus.undo.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._undoSetup = function(r) {

    var stackSize = 5;
    var undoStack = [];

    r.Undo = {};

    // TODO: add redo
    r.Undo._addUndoAction = function(f) {
      var insertIndex = undoStack.length;
      if (undoStack.length >= stackSize) {
        undoStack.shift();
        insertIndex -= 1;
      }
      undoStack[insertIndex] = f;
    };

    r.Undo.canUndo = function() {
      return undoStack.length > 0;
    };

    r.Undo.doUndo = function() {
      if (r.Undo.canUndo()) {
        var action = undoStack.pop();
        action();
      }
    };

  };
})(this.Rhombus);
