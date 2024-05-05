/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                                                

export function createMutableSource                              (
  source        ,
  getVersion                           ,
)                        {
  const mutableSource                        = {
    _getVersion: getVersion,
    _source: source,
    _workInProgressVersionPrimary: null,
    _workInProgressVersionSecondary: null,
  };

  if (__DEV__) {
    mutableSource._currentPrimaryRenderer = null;
    mutableSource._currentSecondaryRenderer = null;

    // Used to detect side effects that update a mutable source during render.
    // See https://github.com/facebook/react/issues/19948
    mutableSource._currentlyRenderingFiber = null;
    mutableSource._initialVersionAsOfFirstRender = null;
  }

  return mutableSource;
}
