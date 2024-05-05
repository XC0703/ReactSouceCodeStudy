/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                
                                                       
                                                                   

import {getChildHostContext, getRootHostContext} from './ReactFiberHostConfig';
import {createCursor, push, pop} from './ReactFiberStack.old';

                           
const NO_CONTEXT             = ({}     );

const contextStackCursor                                        = createCursor(
  NO_CONTEXT,
);
const contextFiberStackCursor                                  = createCursor(
  NO_CONTEXT,
);
const rootInstanceStackCursor              
                         
  = createCursor(NO_CONTEXT);

function requiredContext       (c                    )        {
  if (c === NO_CONTEXT) {
    throw new Error(
      'Expected host context to exist. This error is likely caused by a bug ' +
        'in React. Please file an issue.',
    );
  }

  return (c     );
}

function getRootHostContainer()            {
  const rootInstance = requiredContext(rootInstanceStackCursor.current);
  return rootInstance;
}

function pushHostContainer(fiber       , nextRootInstance           ) {
  // Push current root instance onto the stack;
  // This allows us to reset root when portals are popped.
  push(rootInstanceStackCursor, nextRootInstance, fiber);
  // Track the context and the Fiber that provided it.
  // This enables us to pop only Fibers that provide unique contexts.
  push(contextFiberStackCursor, fiber, fiber);

  // Finally, we need to push the host context to the stack.
  // However, we can't just call getRootHostContext() and push it because
  // we'd have a different number of entries on the stack depending on
  // whether getRootHostContext() throws somewhere in renderer code or not.
  // So we push an empty value first. This lets us safely unwind on errors.
  push(contextStackCursor, NO_CONTEXT, fiber);
  const nextRootContext = getRootHostContext(nextRootInstance);
  // Now that we know this function doesn't throw, replace it.
  pop(contextStackCursor, fiber);
  push(contextStackCursor, nextRootContext, fiber);
}

function popHostContainer(fiber       ) {
  pop(contextStackCursor, fiber);
  pop(contextFiberStackCursor, fiber);
  pop(rootInstanceStackCursor, fiber);
}

function getHostContext()              {
  const context = requiredContext(contextStackCursor.current);
  return context;
}

function pushHostContext(fiber       )       {
  const rootInstance            = requiredContext(
    rootInstanceStackCursor.current,
  );
  const context              = requiredContext(contextStackCursor.current);
  const nextContext = getChildHostContext(context, fiber.type, rootInstance);

  // Don't push this Fiber's context unless it's unique.
  if (context === nextContext) {
    return;
  }

  // Track the context and the Fiber that provided it.
  // This enables us to pop only Fibers that provide unique contexts.
  push(contextFiberStackCursor, fiber, fiber);
  push(contextStackCursor, nextContext, fiber);
}

function popHostContext(fiber       )       {
  // Do not pop unless this Fiber provided the current context.
  // pushHostContext() only pushes Fibers that provide unique contexts.
  if (contextFiberStackCursor.current !== fiber) {
    return;
  }

  pop(contextStackCursor, fiber);
  pop(contextFiberStackCursor, fiber);
}

export {
  getHostContext,
  getRootHostContainer,
  popHostContainer,
  popHostContext,
  pushHostContainer,
  pushHostContext,
};
