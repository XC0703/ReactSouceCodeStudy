/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                
import {NoMode, ConcurrentMode} from './ReactTypeOfMode';
             
           
               
                     
                   
            
              
                                
                                                                     
                                                             
                                                        

import {
  HostComponent,
  HostText,
  HostRoot,
  SuspenseComponent,
} from './ReactWorkTags';
import {
  ChildDeletion,
  Placement,
  Hydrating,
  NoFlags,
  DidCapture,
} from './ReactFiberFlags';

import {
  createFiberFromHostInstanceForDeletion,
  createFiberFromDehydratedFragment,
} from './ReactFiber.new';
import {
  shouldSetTextContent,
  supportsHydration,
  canHydrateInstance,
  canHydrateTextInstance,
  canHydrateSuspenseInstance,
  getNextHydratableSibling,
  getFirstHydratableChild,
  getFirstHydratableChildWithinContainer,
  getFirstHydratableChildWithinSuspenseInstance,
  hydrateInstance,
  hydrateTextInstance,
  hydrateSuspenseInstance,
  getNextHydratableInstanceAfterSuspenseInstance,
  shouldDeleteUnhydratedTailInstances,
  didNotMatchHydratedContainerTextInstance,
  didNotMatchHydratedTextInstance,
  didNotHydrateInstanceWithinContainer,
  didNotHydrateInstanceWithinSuspenseInstance,
  didNotHydrateInstance,
  didNotFindHydratableInstanceWithinContainer,
  didNotFindHydratableTextInstanceWithinContainer,
  didNotFindHydratableSuspenseInstanceWithinContainer,
  didNotFindHydratableInstanceWithinSuspenseInstance,
  didNotFindHydratableTextInstanceWithinSuspenseInstance,
  didNotFindHydratableSuspenseInstanceWithinSuspenseInstance,
  didNotFindHydratableInstance,
  didNotFindHydratableTextInstance,
  didNotFindHydratableSuspenseInstance,
} from './ReactFiberHostConfig';
import {OffscreenLane} from './ReactFiberLane.new';
import {
  getSuspendedTreeContext,
  restoreSuspendedTreeContext,
} from './ReactFiberTreeContext.new';
import {queueRecoverableErrors} from './ReactFiberWorkLoop.new';

// The deepest Fiber on the stack involved in a hydration context.
// This may have been an insertion or a hydration.
let hydrationParentFiber               = null;
let nextHydratableInstance                            = null;
let isHydrating          = false;

// This flag allows for warning supression when we expect there to be mismatches
// due to earlier mismatches or a suspended fiber.
let didSuspendOrErrorDEV          = false;

// Hydration errors that were thrown inside this boundary
let hydrationErrors                                     = null;

function warnIfHydrating() {
  if (__DEV__) {
    if (isHydrating) {
      console.error(
        'We should not be hydrating here. This is a bug in React. Please file a bug.',
      );
    }
  }
}

export function markDidThrowWhileHydratingDEV() {
  if (__DEV__) {
    didSuspendOrErrorDEV = true;
  }
}

export function didSuspendOrErrorWhileHydratingDEV() {
  if (__DEV__) {
    return didSuspendOrErrorDEV;
  }
  return false;
}

function enterHydrationState(fiber       )          {
  if (!supportsHydration) {
    return false;
  }

  const parentInstance            = fiber.stateNode.containerInfo;
  nextHydratableInstance = getFirstHydratableChildWithinContainer(
    parentInstance,
  );
  hydrationParentFiber = fiber;
  isHydrating = true;
  hydrationErrors = null;
  didSuspendOrErrorDEV = false;
  return true;
}

function reenterHydrationStateFromDehydratedSuspenseInstance(
  fiber       ,
  suspenseInstance                  ,
  treeContext                    ,
)          {
  if (!supportsHydration) {
    return false;
  }
  nextHydratableInstance = getFirstHydratableChildWithinSuspenseInstance(
    suspenseInstance,
  );
  hydrationParentFiber = fiber;
  isHydrating = true;
  hydrationErrors = null;
  didSuspendOrErrorDEV = false;
  if (treeContext !== null) {
    restoreSuspendedTreeContext(fiber, treeContext);
  }
  return true;
}

function warnUnhydratedInstance(
  returnFiber       ,
  instance                    ,
) {
  if (__DEV__) {
    switch (returnFiber.tag) {
      case HostRoot: {
        didNotHydrateInstanceWithinContainer(
          returnFiber.stateNode.containerInfo,
          instance,
        );
        break;
      }
      case HostComponent: {
        const isConcurrentMode = (returnFiber.mode & ConcurrentMode) !== NoMode;
        didNotHydrateInstance(
          returnFiber.type,
          returnFiber.memoizedProps,
          returnFiber.stateNode,
          instance,
          // TODO: Delete this argument when we remove the legacy root API.
          isConcurrentMode,
        );
        break;
      }
      case SuspenseComponent: {
        const suspenseState                = returnFiber.memoizedState;
        if (suspenseState.dehydrated !== null)
          didNotHydrateInstanceWithinSuspenseInstance(
            suspenseState.dehydrated,
            instance,
          );
        break;
      }
    }
  }
}

function deleteHydratableInstance(
  returnFiber       ,
  instance                    ,
) {
  warnUnhydratedInstance(returnFiber, instance);
  const childToDelete = createFiberFromHostInstanceForDeletion();
  childToDelete.stateNode = instance;
  childToDelete.return = returnFiber;

  const deletions = returnFiber.deletions;
  if (deletions === null) {
    returnFiber.deletions = [childToDelete];
    returnFiber.flags |= ChildDeletion;
  } else {
    deletions.push(childToDelete);
  }
}

function warnNonhydratedInstance(returnFiber       , fiber       ) {
  if (__DEV__) {
    if (didSuspendOrErrorDEV) {
      // Inside a boundary that already suspended. We're currently rendering the
      // siblings of a suspended node. The mismatch may be due to the missing
      // data, so it's probably a false positive.
      return;
    }

    switch (returnFiber.tag) {
      case HostRoot: {
        const parentContainer = returnFiber.stateNode.containerInfo;
        switch (fiber.tag) {
          case HostComponent:
            const type = fiber.type;
            const props = fiber.pendingProps;
            didNotFindHydratableInstanceWithinContainer(
              parentContainer,
              type,
              props,
            );
            break;
          case HostText:
            const text = fiber.pendingProps;
            didNotFindHydratableTextInstanceWithinContainer(
              parentContainer,
              text,
            );
            break;
          case SuspenseComponent:
            didNotFindHydratableSuspenseInstanceWithinContainer(
              parentContainer,
            );
            break;
        }
        break;
      }
      case HostComponent: {
        const parentType = returnFiber.type;
        const parentProps = returnFiber.memoizedProps;
        const parentInstance = returnFiber.stateNode;
        switch (fiber.tag) {
          case HostComponent: {
            const type = fiber.type;
            const props = fiber.pendingProps;
            const isConcurrentMode =
              (returnFiber.mode & ConcurrentMode) !== NoMode;
            didNotFindHydratableInstance(
              parentType,
              parentProps,
              parentInstance,
              type,
              props,
              // TODO: Delete this argument when we remove the legacy root API.
              isConcurrentMode,
            );
            break;
          }
          case HostText: {
            const text = fiber.pendingProps;
            const isConcurrentMode =
              (returnFiber.mode & ConcurrentMode) !== NoMode;
            didNotFindHydratableTextInstance(
              parentType,
              parentProps,
              parentInstance,
              text,
              // TODO: Delete this argument when we remove the legacy root API.
              isConcurrentMode,
            );
            break;
          }
          case SuspenseComponent: {
            didNotFindHydratableSuspenseInstance(
              parentType,
              parentProps,
              parentInstance,
            );
            break;
          }
        }
        break;
      }
      case SuspenseComponent: {
        const suspenseState                = returnFiber.memoizedState;
        const parentInstance = suspenseState.dehydrated;
        if (parentInstance !== null)
          switch (fiber.tag) {
            case HostComponent:
              const type = fiber.type;
              const props = fiber.pendingProps;
              didNotFindHydratableInstanceWithinSuspenseInstance(
                parentInstance,
                type,
                props,
              );
              break;
            case HostText:
              const text = fiber.pendingProps;
              didNotFindHydratableTextInstanceWithinSuspenseInstance(
                parentInstance,
                text,
              );
              break;
            case SuspenseComponent:
              didNotFindHydratableSuspenseInstanceWithinSuspenseInstance(
                parentInstance,
              );
              break;
          }
        break;
      }
      default:
        return;
    }
  }
}
function insertNonHydratedInstance(returnFiber       , fiber       ) {
  fiber.flags = (fiber.flags & ~Hydrating) | Placement;
  warnNonhydratedInstance(returnFiber, fiber);
}

function tryHydrate(fiber, nextInstance) {
  switch (fiber.tag) {
    case HostComponent: {
      const type = fiber.type;
      const props = fiber.pendingProps;
      const instance = canHydrateInstance(nextInstance, type, props);
      if (instance !== null) {
        fiber.stateNode = (instance          );
        hydrationParentFiber = fiber;
        nextHydratableInstance = getFirstHydratableChild(instance);
        return true;
      }
      return false;
    }
    case HostText: {
      const text = fiber.pendingProps;
      const textInstance = canHydrateTextInstance(nextInstance, text);
      if (textInstance !== null) {
        fiber.stateNode = (textInstance              );
        hydrationParentFiber = fiber;
        // Text Instances don't have children so there's nothing to hydrate.
        nextHydratableInstance = null;
        return true;
      }
      return false;
    }
    case SuspenseComponent: {
      const suspenseInstance                          = canHydrateSuspenseInstance(
        nextInstance,
      );
      if (suspenseInstance !== null) {
        const suspenseState                = {
          dehydrated: suspenseInstance,
          treeContext: getSuspendedTreeContext(),
          retryLane: OffscreenLane,
        };
        fiber.memoizedState = suspenseState;
        // Store the dehydrated fragment as a child fiber.
        // This simplifies the code for getHostSibling and deleting nodes,
        // since it doesn't have to consider all Suspense boundaries and
        // check if they're dehydrated ones or not.
        const dehydratedFragment = createFiberFromDehydratedFragment(
          suspenseInstance,
        );
        dehydratedFragment.return = fiber;
        fiber.child = dehydratedFragment;
        hydrationParentFiber = fiber;
        // While a Suspense Instance does have children, we won't step into
        // it during the first pass. Instead, we'll reenter it later.
        nextHydratableInstance = null;
        return true;
      }
      return false;
    }
    default:
      return false;
  }
}

function shouldClientRenderOnMismatch(fiber       ) {
  return (
    (fiber.mode & ConcurrentMode) !== NoMode &&
    (fiber.flags & DidCapture) === NoFlags
  );
}

function throwOnHydrationMismatch(fiber       ) {
  throw new Error(
    'Hydration failed because the initial UI does not match what was ' +
      'rendered on the server.',
  );
}

function tryToClaimNextHydratableInstance(fiber       )       {
  if (!isHydrating) {
    return;
  }
  let nextInstance = nextHydratableInstance;
  if (!nextInstance) {
    if (shouldClientRenderOnMismatch(fiber)) {
      warnNonhydratedInstance((hydrationParentFiber     ), fiber);
      throwOnHydrationMismatch(fiber);
    }
    // Nothing to hydrate. Make it an insertion.
    insertNonHydratedInstance((hydrationParentFiber     ), fiber);
    isHydrating = false;
    hydrationParentFiber = fiber;
    return;
  }
  const firstAttemptedInstance = nextInstance;
  if (!tryHydrate(fiber, nextInstance)) {
    if (shouldClientRenderOnMismatch(fiber)) {
      warnNonhydratedInstance((hydrationParentFiber     ), fiber);
      throwOnHydrationMismatch(fiber);
    }
    // If we can't hydrate this instance let's try the next one.
    // We use this as a heuristic. It's based on intuition and not data so it
    // might be flawed or unnecessary.
    nextInstance = getNextHydratableSibling(firstAttemptedInstance);
    const prevHydrationParentFiber        = (hydrationParentFiber     );
    if (!nextInstance || !tryHydrate(fiber, nextInstance)) {
      // Nothing to hydrate. Make it an insertion.
      insertNonHydratedInstance((hydrationParentFiber     ), fiber);
      isHydrating = false;
      hydrationParentFiber = fiber;
      return;
    }
    // We matched the next one, we'll now assume that the first one was
    // superfluous and we'll delete it. Since we can't eagerly delete it
    // we'll have to schedule a deletion. To do that, this node needs a dummy
    // fiber associated with it.
    deleteHydratableInstance(prevHydrationParentFiber, firstAttemptedInstance);
  }
}

function prepareToHydrateHostInstance(
  fiber       ,
  rootContainerInstance           ,
  hostContext             ,
)          {
  if (!supportsHydration) {
    throw new Error(
      'Expected prepareToHydrateHostInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  const instance           = fiber.stateNode;
  const shouldWarnIfMismatchDev = !didSuspendOrErrorDEV;
  const updatePayload = hydrateInstance(
    instance,
    fiber.type,
    fiber.memoizedProps,
    rootContainerInstance,
    hostContext,
    fiber,
    shouldWarnIfMismatchDev,
  );
  // TODO: Type this specific to this type of component.
  fiber.updateQueue = (updatePayload     );
  // If the update payload indicates that there is a change or if there
  // is a new ref we mark this as an update.
  if (updatePayload !== null) {
    return true;
  }
  return false;
}

function prepareToHydrateHostTextInstance(fiber       )          {
  if (!supportsHydration) {
    throw new Error(
      'Expected prepareToHydrateHostTextInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  const textInstance               = fiber.stateNode;
  const textContent         = fiber.memoizedProps;
  const shouldWarnIfMismatchDev = !didSuspendOrErrorDEV;
  const shouldUpdate = hydrateTextInstance(
    textInstance,
    textContent,
    fiber,
    shouldWarnIfMismatchDev,
  );
  if (shouldUpdate) {
    // We assume that prepareToHydrateHostTextInstance is called in a context where the
    // hydration parent is the parent host component of this host text.
    const returnFiber = hydrationParentFiber;
    if (returnFiber !== null) {
      switch (returnFiber.tag) {
        case HostRoot: {
          const parentContainer = returnFiber.stateNode.containerInfo;
          const isConcurrentMode =
            (returnFiber.mode & ConcurrentMode) !== NoMode;
          didNotMatchHydratedContainerTextInstance(
            parentContainer,
            textInstance,
            textContent,
            // TODO: Delete this argument when we remove the legacy root API.
            isConcurrentMode,
          );
          break;
        }
        case HostComponent: {
          const parentType = returnFiber.type;
          const parentProps = returnFiber.memoizedProps;
          const parentInstance = returnFiber.stateNode;
          const isConcurrentMode =
            (returnFiber.mode & ConcurrentMode) !== NoMode;
          didNotMatchHydratedTextInstance(
            parentType,
            parentProps,
            parentInstance,
            textInstance,
            textContent,
            // TODO: Delete this argument when we remove the legacy root API.
            isConcurrentMode,
          );
          break;
        }
      }
    }
  }
  return shouldUpdate;
}

function prepareToHydrateHostSuspenseInstance(fiber       )       {
  if (!supportsHydration) {
    throw new Error(
      'Expected prepareToHydrateHostSuspenseInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  const suspenseState                       = fiber.memoizedState;
  const suspenseInstance                          =
    suspenseState !== null ? suspenseState.dehydrated : null;

  if (!suspenseInstance) {
    throw new Error(
      'Expected to have a hydrated suspense instance. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  hydrateSuspenseInstance(suspenseInstance, fiber);
}

function skipPastDehydratedSuspenseInstance(
  fiber       ,
)                            {
  if (!supportsHydration) {
    throw new Error(
      'Expected skipPastDehydratedSuspenseInstance() to never be called. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }
  const suspenseState                       = fiber.memoizedState;
  const suspenseInstance                          =
    suspenseState !== null ? suspenseState.dehydrated : null;

  if (!suspenseInstance) {
    throw new Error(
      'Expected to have a hydrated suspense instance. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }

  return getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance);
}

function popToNextHostParent(fiber       )       {
  let parent = fiber.return;
  while (
    parent !== null &&
    parent.tag !== HostComponent &&
    parent.tag !== HostRoot &&
    parent.tag !== SuspenseComponent
  ) {
    parent = parent.return;
  }
  hydrationParentFiber = parent;
}

function popHydrationState(fiber       )          {
  if (!supportsHydration) {
    return false;
  }
  if (fiber !== hydrationParentFiber) {
    // We're deeper than the current hydration context, inside an inserted
    // tree.
    return false;
  }
  if (!isHydrating) {
    // If we're not currently hydrating but we're in a hydration context, then
    // we were an insertion and now need to pop up reenter hydration of our
    // siblings.
    popToNextHostParent(fiber);
    isHydrating = true;
    return false;
  }

  // If we have any remaining hydratable nodes, we need to delete them now.
  // We only do this deeper than head and body since they tend to have random
  // other nodes in them. We also ignore components with pure text content in
  // side of them. We also don't delete anything inside the root container.
  if (
    fiber.tag !== HostRoot &&
    (fiber.tag !== HostComponent ||
      (shouldDeleteUnhydratedTailInstances(fiber.type) &&
        !shouldSetTextContent(fiber.type, fiber.memoizedProps)))
  ) {
    let nextInstance = nextHydratableInstance;
    if (nextInstance) {
      if (shouldClientRenderOnMismatch(fiber)) {
        warnIfUnhydratedTailNodes(fiber);
        throwOnHydrationMismatch(fiber);
      } else {
        while (nextInstance) {
          deleteHydratableInstance(fiber, nextInstance);
          nextInstance = getNextHydratableSibling(nextInstance);
        }
      }
    }
  }
  popToNextHostParent(fiber);
  if (fiber.tag === SuspenseComponent) {
    nextHydratableInstance = skipPastDehydratedSuspenseInstance(fiber);
  } else {
    nextHydratableInstance = hydrationParentFiber
      ? getNextHydratableSibling(fiber.stateNode)
      : null;
  }
  return true;
}

function hasUnhydratedTailNodes() {
  return isHydrating && nextHydratableInstance !== null;
}

function warnIfUnhydratedTailNodes(fiber       ) {
  let nextInstance = nextHydratableInstance;
  while (nextInstance) {
    warnUnhydratedInstance(fiber, nextInstance);
    nextInstance = getNextHydratableSibling(nextInstance);
  }
}

function resetHydrationState()       {
  if (!supportsHydration) {
    return;
  }

  hydrationParentFiber = null;
  nextHydratableInstance = null;
  isHydrating = false;
  didSuspendOrErrorDEV = false;
}

export function upgradeHydrationErrorsToRecoverable()       {
  if (hydrationErrors !== null) {
    // Successfully completed a forced client render. The errors that occurred
    // during the hydration attempt are now recovered. We will log them in
    // commit phase, once the entire tree has finished.
    queueRecoverableErrors(hydrationErrors);
    hydrationErrors = null;
  }
}

function getIsHydrating()          {
  return isHydrating;
}

export function queueHydrationError(error                      )       {
  if (hydrationErrors === null) {
    hydrationErrors = [error];
  } else {
    hydrationErrors.push(error);
  }
}

export {
  warnIfHydrating,
  enterHydrationState,
  getIsHydrating,
  reenterHydrationStateFromDehydratedSuspenseInstance,
  resetHydrationState,
  tryToClaimNextHydratableInstance,
  prepareToHydrateHostInstance,
  prepareToHydrateHostTextInstance,
  prepareToHydrateHostSuspenseInstance,
  popHydrationState,
  hasUnhydratedTailNodes,
  warnIfUnhydratedTailNodes,
};
