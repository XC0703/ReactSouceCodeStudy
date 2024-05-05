/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                

import {
  enableProfilerCommitHooks,
  enableProfilerNestedUpdatePhase,
  enableProfilerTimer,
} from 'shared/ReactFeatureFlags';
import {HostRoot, Profiler} from './ReactWorkTags';

// Intentionally not named imports because Rollup would use dynamic dispatch for
// CommonJS interop named imports.
import * as Scheduler from 'scheduler';

const {unstable_now: now} = Scheduler;

                             
                          
                                   
                                    
                           
                                         
                                                 
                                                               
                               
     
  

let commitTime         = 0;
let layoutEffectStartTime         = -1;
let profilerStartTime         = -1;
let passiveEffectStartTime         = -1;

/**
 * Tracks whether the current update was a nested/cascading update (scheduled from a layout effect).
 *
 * The overall sequence is:
 *   1. render
 *   2. commit (and call `onRender`, `onCommit`)
 *   3. check for nested updates
 *   4. flush passive effects (and call `onPostCommit`)
 *
 * Nested updates are identified in step 3 above,
 * but step 4 still applies to the work that was just committed.
 * We use two flags to track nested updates then:
 * one tracks whether the upcoming update is a nested update,
 * and the other tracks whether the current update was a nested update.
 * The first value gets synced to the second at the start of the render phase.
 */
let currentUpdateIsNested          = false;
let nestedUpdateScheduled          = false;

function isCurrentUpdateNested()          {
  return currentUpdateIsNested;
}

function markNestedUpdateScheduled()       {
  if (enableProfilerNestedUpdatePhase) {
    nestedUpdateScheduled = true;
  }
}

function resetNestedUpdateFlag()       {
  if (enableProfilerNestedUpdatePhase) {
    currentUpdateIsNested = false;
    nestedUpdateScheduled = false;
  }
}

function syncNestedUpdateFlag()       {
  if (enableProfilerNestedUpdatePhase) {
    currentUpdateIsNested = nestedUpdateScheduled;
    nestedUpdateScheduled = false;
  }
}

function getCommitTime()         {
  return commitTime;
}

function recordCommitTime()       {
  if (!enableProfilerTimer) {
    return;
  }
  commitTime = now();
}

function startProfilerTimer(fiber       )       {
  if (!enableProfilerTimer) {
    return;
  }

  profilerStartTime = now();

  if (((fiber.actualStartTime     )        ) < 0) {
    fiber.actualStartTime = now();
  }
}

function stopProfilerTimerIfRunning(fiber       )       {
  if (!enableProfilerTimer) {
    return;
  }
  profilerStartTime = -1;
}

function stopProfilerTimerIfRunningAndRecordDelta(
  fiber       ,
  overrideBaseTime         ,
)       {
  if (!enableProfilerTimer) {
    return;
  }

  if (profilerStartTime >= 0) {
    const elapsedTime = now() - profilerStartTime;
    fiber.actualDuration += elapsedTime;
    if (overrideBaseTime) {
      fiber.selfBaseDuration = elapsedTime;
    }
    profilerStartTime = -1;
  }
}

function recordLayoutEffectDuration(fiber       )       {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }

  if (layoutEffectStartTime >= 0) {
    const elapsedTime = now() - layoutEffectStartTime;

    layoutEffectStartTime = -1;

    // Store duration on the next nearest Profiler ancestor
    // Or the root (for the DevTools Profiler to read)
    let parentFiber = fiber.return;
    while (parentFiber !== null) {
      switch (parentFiber.tag) {
        case HostRoot:
          const root = parentFiber.stateNode;
          root.effectDuration += elapsedTime;
          return;
        case Profiler:
          const parentStateNode = parentFiber.stateNode;
          parentStateNode.effectDuration += elapsedTime;
          return;
      }
      parentFiber = parentFiber.return;
    }
  }
}

function recordPassiveEffectDuration(fiber       )       {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }

  if (passiveEffectStartTime >= 0) {
    const elapsedTime = now() - passiveEffectStartTime;

    passiveEffectStartTime = -1;

    // Store duration on the next nearest Profiler ancestor
    // Or the root (for the DevTools Profiler to read)
    let parentFiber = fiber.return;
    while (parentFiber !== null) {
      switch (parentFiber.tag) {
        case HostRoot:
          const root = parentFiber.stateNode;
          if (root !== null) {
            root.passiveEffectDuration += elapsedTime;
          }
          return;
        case Profiler:
          const parentStateNode = parentFiber.stateNode;
          if (parentStateNode !== null) {
            // Detached fibers have their state node cleared out.
            // In this case, the return pointer is also cleared out,
            // so we won't be able to report the time spent in this Profiler's subtree.
            parentStateNode.passiveEffectDuration += elapsedTime;
          }
          return;
      }
      parentFiber = parentFiber.return;
    }
  }
}

function startLayoutEffectTimer()       {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  layoutEffectStartTime = now();
}

function startPassiveEffectTimer()       {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  passiveEffectStartTime = now();
}

function transferActualDuration(fiber       )       {
  // Transfer time spent rendering these children so we don't lose it
  // after we rerender. This is used as a helper in special cases
  // where we should count the work of multiple passes.
  let child = fiber.child;
  while (child) {
    fiber.actualDuration += child.actualDuration;
    child = child.sibling;
  }
}

export {
  getCommitTime,
  isCurrentUpdateNested,
  markNestedUpdateScheduled,
  recordCommitTime,
  recordLayoutEffectDuration,
  recordPassiveEffectDuration,
  resetNestedUpdateFlag,
  startLayoutEffectTimer,
  startPassiveEffectTimer,
  startProfilerTimer,
  stopProfilerTimerIfRunning,
  stopProfilerTimerIfRunningAndRecordDelta,
  syncNestedUpdateFlag,
  transferActualDuration,
};
