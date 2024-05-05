/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import {enableNewReconciler} from 'shared/ReactFeatureFlags';

import {
  DiscreteEventPriority as DiscreteEventPriority_old,
  ContinuousEventPriority as ContinuousEventPriority_old,
  DefaultEventPriority as DefaultEventPriority_old,
  IdleEventPriority as IdleEventPriority_old,
  getCurrentUpdatePriority as getCurrentUpdatePriority_old,
  setCurrentUpdatePriority as setCurrentUpdatePriority_old,
  runWithPriority as runWithPriority_old,
  isHigherEventPriority as isHigherEventPriority_old,
} from './ReactEventPriorities.old';

import {
  DiscreteEventPriority as DiscreteEventPriority_new,
  ContinuousEventPriority as ContinuousEventPriority_new,
  DefaultEventPriority as DefaultEventPriority_new,
  IdleEventPriority as IdleEventPriority_new,
  getCurrentUpdatePriority as getCurrentUpdatePriority_new,
  setCurrentUpdatePriority as setCurrentUpdatePriority_new,
  runWithPriority as runWithPriority_new,
  isHigherEventPriority as isHigherEventPriority_new,
} from './ReactEventPriorities.new';

                                          

export const DiscreteEventPriority                = enableNewReconciler
  ? (DiscreteEventPriority_new     )
  : (DiscreteEventPriority_old     );
export const ContinuousEventPriority                = enableNewReconciler
  ? (ContinuousEventPriority_new     )
  : (ContinuousEventPriority_old     );
export const DefaultEventPriority                = enableNewReconciler
  ? (DefaultEventPriority_new     )
  : (DefaultEventPriority_old     );
export const IdleEventPriority                = enableNewReconciler
  ? (IdleEventPriority_new     )
  : (IdleEventPriority_old     );

export function runWithPriority   (priority               , fn         )    {
  return enableNewReconciler
    ? runWithPriority_new((priority     ), fn)
    : runWithPriority_old((priority     ), fn);
}

export function getCurrentUpdatePriority()                {
  return enableNewReconciler
    ? (getCurrentUpdatePriority_new()     )
    : (getCurrentUpdatePriority_old()     );
}

export function setCurrentUpdatePriority(priority               ) {
  return enableNewReconciler
    ? setCurrentUpdatePriority_new((priority     ))
    : setCurrentUpdatePriority_old((priority     ));
}

export function isHigherEventPriority(
  a               ,
  b               ,
)          {
  return enableNewReconciler
    ? isHigherEventPriority_new((a     ), (b     ))
    : isHigherEventPriority_old((a     ), (b     ));
}
