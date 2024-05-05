/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                    
             
                           
                       
                               
             
                            
                        
                                          
                                                      
                                                                      

import {warnAboutUpdateOnNotYetMountedFiberInDEV} from './ReactFiberWorkLoop.new';
import {
  NoLane,
  NoLanes,
  mergeLanes,
  markHiddenUpdate,
} from './ReactFiberLane.new';
import {NoFlags, Placement, Hydrating} from './ReactFiberFlags';
import {HostRoot, OffscreenComponent} from './ReactWorkTags';

                                
                         
             
  

                        
                                   
  

// If a render is in progress, and we receive an update from a concurrent event,
// we wait until the current render is over (either finished or interrupted)
// before adding it to the fiber/hook queue. Push to this array so we can
// access the queue, fiber, update, et al later.
const concurrentQueues             = [];
let concurrentQueuesIndex = 0;

let concurrentlyUpdatedLanes        = NoLanes;

export function finishQueueingConcurrentUpdates()       {
  const endIndex = concurrentQueuesIndex;
  concurrentQueuesIndex = 0;

  concurrentlyUpdatedLanes = NoLanes;

  let i = 0;
  while (i < endIndex) {
    const fiber        = concurrentQueues[i];
    concurrentQueues[i++] = null;
    const queue                  = concurrentQueues[i];
    concurrentQueues[i++] = null;
    const update                   = concurrentQueues[i];
    concurrentQueues[i++] = null;
    const lane       = concurrentQueues[i];
    concurrentQueues[i++] = null;

    if (queue !== null && update !== null) {
      const pending = queue.pending;
      if (pending === null) {
        // This is the first update. Create a circular list.
        update.next = update;
      } else {
        update.next = pending.next;
        pending.next = update;
      }
      queue.pending = update;
    }

    if (lane !== NoLane) {
      markUpdateLaneFromFiberToRoot(fiber, update, lane);
    }
  }
}

export function getConcurrentlyUpdatedLanes()        {
  return concurrentlyUpdatedLanes;
}

function enqueueUpdate(
  fiber       ,
  queue                        ,
  update                         ,
  lane      ,
) {
  // Don't update the `childLanes` on the return path yet. If we already in
  // the middle of rendering, wait until after it has completed.
  concurrentQueues[concurrentQueuesIndex++] = fiber;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
  concurrentQueues[concurrentQueuesIndex++] = lane;

  concurrentlyUpdatedLanes = mergeLanes(concurrentlyUpdatedLanes, lane);

  // The fiber's `lane` field is used in some places to check if any work is
  // scheduled, to perform an eager bailout, so we need to update it immediately.
  // TODO: We should probably move this to the "shared" queue instead.
  fiber.lanes = mergeLanes(fiber.lanes, lane);
  const alternate = fiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }
}

export function enqueueConcurrentHookUpdate      (
  fiber       ,
  queue                 ,
  update                  ,
  lane      ,
)                   {
  const concurrentQueue                  = (queue     );
  const concurrentUpdate                   = (update     );
  enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
  return getRootForUpdatedFiber(fiber);
}

export function enqueueConcurrentHookUpdateAndEagerlyBailout      (
  fiber       ,
  queue                 ,
  update                  ,
)       {
  // This function is used to queue an update that doesn't need a rerender. The
  // only reason we queue it is in case there's a subsequent higher priority
  // update that causes it to be rebased.
  const lane = NoLane;
  const concurrentQueue                  = (queue     );
  const concurrentUpdate                   = (update     );
  enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
}

export function enqueueConcurrentClassUpdate       (
  fiber       ,
  queue                   ,
  update                    ,
  lane      ,
)                   {
  const concurrentQueue                  = (queue     );
  const concurrentUpdate                   = (update     );
  enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
  return getRootForUpdatedFiber(fiber);
}

export function enqueueConcurrentRenderForLane(
  fiber       ,
  lane      ,
)                   {
  enqueueUpdate(fiber, null, null, lane);
  return getRootForUpdatedFiber(fiber);
}

// Calling this function outside this module should only be done for backwards
// compatibility and should always be accompanied by a warning.
export function unsafe_markUpdateLaneFromFiberToRoot(
  sourceFiber       ,
  lane      ,
)                   {
  markUpdateLaneFromFiberToRoot(sourceFiber, null, lane);
  return getRootForUpdatedFiber(sourceFiber);
}

function markUpdateLaneFromFiberToRoot(
  sourceFiber       ,
  update                         ,
  lane      ,
)       {
  // Update the source fiber's lanes
  sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
  let alternate = sourceFiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }
  // Walk the parent path to the root and update the child lanes.
  let isHidden = false;
  let parent = sourceFiber.return;
  let node = sourceFiber;
  while (parent !== null) {
    parent.childLanes = mergeLanes(parent.childLanes, lane);
    alternate = parent.alternate;
    if (alternate !== null) {
      alternate.childLanes = mergeLanes(alternate.childLanes, lane);
    }

    if (parent.tag === OffscreenComponent) {
      const offscreenInstance                    = parent.stateNode;
      if (offscreenInstance.isHidden) {
        isHidden = true;
      }
    }

    node = parent;
    parent = parent.return;
  }

  if (isHidden && update !== null && node.tag === HostRoot) {
    const root            = node.stateNode;
    markHiddenUpdate(root, update, lane);
  }
}

function getRootForUpdatedFiber(sourceFiber       )                   {
  // When a setState happens, we must ensure the root is scheduled. Because
  // update queues do not have a backpointer to the root, the only way to do
  // this currently is to walk up the return path. This used to not be a big
  // deal because we would have to walk up the return path to set
  // the `childLanes`, anyway, but now those two traversals happen at
  // different times.
  // TODO: Consider adding a `root` backpointer on the update queue.
  detectUpdateOnUnmountedFiber(sourceFiber, sourceFiber);
  let node = sourceFiber;
  let parent = node.return;
  while (parent !== null) {
    detectUpdateOnUnmountedFiber(sourceFiber, node);
    node = parent;
    parent = node.return;
  }
  return node.tag === HostRoot ? (node.stateNode           ) : null;
}

function detectUpdateOnUnmountedFiber(sourceFiber       , parent       ) {
  if (__DEV__) {
    const alternate = parent.alternate;
    if (
      alternate === null &&
      (parent.flags & (Placement | Hydrating)) !== NoFlags
    ) {
      warnAboutUpdateOnNotYetMountedFiberInDEV(sourceFiber);
    }
  }
}
