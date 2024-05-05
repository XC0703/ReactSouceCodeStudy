/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                               
                                                
                                                             
                                               
                                                             

import {enableSuspenseAvoidThisFallback} from 'shared/ReactFeatureFlags';
import {SuspenseComponent, SuspenseListComponent} from './ReactWorkTags';
import {NoFlags, DidCapture} from './ReactFiberFlags';
import {
  isSuspenseInstancePending,
  isSuspenseInstanceFallback,
} from './ReactFiberHostConfig';

                              
                           
                           

                                  
                                                     

                                     
                         
   

// A null SuspenseState represents an unsuspended normal Suspense boundary.
// A non-null SuspenseState means that it is blocked for one reason or another.
// - A non-null dehydrated field means it's blocked pending hydration.
//   - A non-null dehydrated field can use isSuspenseInstancePending or
//     isSuspenseInstanceFallback to query the reason for being dehydrated.
// - A null dehydrated field means it's blocked by something suspending and
//   we're currently showing a fallback instead.
                              
                                                                        
                                                                       
                                                    
                                      
                                  
                                                                               
                                                            
                                                                                
                  
   

                                                                 

                                        
                       
                                      
                          
                                                                          
                             
                                               
                     
                                            
                     
                             
                                 
   

export function shouldCaptureSuspense(
  workInProgress       ,
  hasInvisibleParent         ,
)          {
  // If it was the primary children that just suspended, capture and render the
  // fallback. Otherwise, don't capture and bubble to the next boundary.
  const nextState                       = workInProgress.memoizedState;
  if (nextState !== null) {
    if (nextState.dehydrated !== null) {
      // A dehydrated boundary always captures.
      return true;
    }
    return false;
  }
  const props = workInProgress.memoizedProps;
  // Regular boundaries always capture.
  if (
    !enableSuspenseAvoidThisFallback ||
    props.unstable_avoidThisFallback !== true
  ) {
    return true;
  }
  // If it's a boundary we should avoid, then we prefer to bubble up to the
  // parent boundary if it is currently invisible.
  if (hasInvisibleParent) {
    return false;
  }
  // If the parent is not able to handle it, we must handle it.
  return true;
}

export function findFirstSuspended(row       )               {
  let node = row;
  while (node !== null) {
    if (node.tag === SuspenseComponent) {
      const state                       = node.memoizedState;
      if (state !== null) {
        const dehydrated                          = state.dehydrated;
        if (
          dehydrated === null ||
          isSuspenseInstancePending(dehydrated) ||
          isSuspenseInstanceFallback(dehydrated)
        ) {
          return node;
        }
      }
    } else if (
      node.tag === SuspenseListComponent &&
      // revealOrder undefined can't be trusted because it don't
      // keep track of whether it suspended or not.
      node.memoizedProps.revealOrder !== undefined
    ) {
      const didSuspend = (node.flags & DidCapture) !== NoFlags;
      if (didSuspend) {
        return node;
      }
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === row) {
      return null;
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === row) {
        return null;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  return null;
}
