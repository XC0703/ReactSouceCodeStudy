/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import ReactSharedInternals from 'shared/ReactSharedInternals';
                                                                       

const {ReactCurrentBatchConfig} = ReactSharedInternals;

export const NoTransition = null;

export function requestCurrentTransition()                    {
  return ReactCurrentBatchConfig.transition;
}
