/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import invokeGuardedCallbackImpl from './invokeGuardedCallbackImpl';

// Used by Fiber to simulate a try-catch.
let hasError          = false;
let caughtError        = null;

// Used by event system to capture/rethrow the first error.
let hasRethrowError          = false;
let rethrowError        = null;

const reporter = {
  onError(error       ) {
    hasError = true;
    caughtError = error;
  },
};

/**
 * Call a function while guarding against errors that happens within it.
 * Returns an error if it throws, otherwise null.
 *
 * In production, this is implemented using a try-catch. The reason we don't
 * use a try-catch directly is so that we can swap out a different
 * implementation in DEV mode.
 *
 * @param {String} name of the guard to use for logging or debugging
 * @param {Function} func The function to invoke
 * @param {*} context The context to use when calling the function
 * @param {...*} args Arguments for function
 */
export function invokeGuardedCallback                           (
  name               ,
  func                                               ,
  context         ,
  a   ,
  b   ,
  c   ,
  d   ,
  e   ,
  f   ,
)       {
  hasError = false;
  caughtError = null;
  invokeGuardedCallbackImpl.apply(reporter, arguments);
}

/**
 * Same as invokeGuardedCallback, but instead of returning an error, it stores
 * it in a global so it can be rethrown by `rethrowCaughtError` later.
 * TODO: See if caughtError and rethrowError can be unified.
 *
 * @param {String} name of the guard to use for logging or debugging
 * @param {Function} func The function to invoke
 * @param {*} context The context to use when calling the function
 * @param {...*} args Arguments for function
 */
export function invokeGuardedCallbackAndCatchFirstError 
    
    
    
    
    
    
          
 (
  name               ,
  func                                              ,
  context         ,
  a   ,
  b   ,
  c   ,
  d   ,
  e   ,
  f   ,
)       {
  invokeGuardedCallback.apply(this, arguments);
  if (hasError) {
    const error = clearCaughtError();
    if (!hasRethrowError) {
      hasRethrowError = true;
      rethrowError = error;
    }
  }
}

/**
 * During execution of guarded functions we will capture the first error which
 * we will rethrow to be handled by the top level error handler.
 */
export function rethrowCaughtError() {
  if (hasRethrowError) {
    const error = rethrowError;
    hasRethrowError = false;
    rethrowError = null;
    throw error;
  }
}

export function hasCaughtError() {
  return hasError;
}

export function clearCaughtError() {
  if (hasError) {
    const error = caughtError;
    hasError = false;
    caughtError = null;
    return error;
  } else {
    throw new Error(
      'clearCaughtError was called but no error was captured. This error ' +
        'is likely caused by a bug in React. Please file an issue.',
    );
  }
}
