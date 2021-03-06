//! rhombus.undo.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

/**
 * A class for managing undo functionality on a Rhombus instance.
 * Don't create one yourself.
 * @constructor
 */
Rhombus.Undo = function() {
  this._stackSize = 1024;
  this._undoStack = [];
  this._addedListeners = [];
};

Rhombus.Undo.prototype._registerUndoAddedCallback = function(f) {
  this._addedListeners.push(f);
};

Rhombus.Undo.prototype._addUndoAction = function(f) {
  for (var listenerIdx = 0; listenerIdx < this._addedListeners.length; listenerIdx++) {
    var listener = this._addedListeners[listenerIdx];
    listener();
  }

  var insertIndex = this._undoStack.length;
  if (this._undoStack.length == this._stackSize) {
    this._undoStack.shift();
    insertIndex -= 1;
  }
  this._undoStack[insertIndex] = f;
};

Rhombus.Undo.prototype._clearUndoStack = function() {
  this._undoStack = [];
};

/** Returns true if there are actions to undo. */
/** @returns {Boolean} true if there are actions to undo. */
Rhombus.Undo.prototype.canUndo = function() {
  return this._undoStack.length > 0;
};

/**
 * Executes the most recent undo action, changing Rhombus state.
 * This call can drastically change the song state in Rhombus, so make sure
 * to refresh any data you need to (i.e. everything).
 */
Rhombus.Undo.prototype.doUndo = function() {
  if (this.canUndo()) {
    var action = this._undoStack.pop();
    action();
  }
};
