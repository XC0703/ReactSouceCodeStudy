/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */
                                                    
                                                
                                                       
                                                                            
                                                                       

import {enableCache, enableTransitionTracing} from 'shared/ReactFeatureFlags';
import {isPrimaryRenderer} from './ReactFiberHostConfig';
import {createCursor, push, pop} from './ReactFiberStack.old';
import {
  getWorkInProgressRoot,
  getWorkInProgressTransitions,
} from './ReactFiberWorkLoop.old';
import {
  createCache,
  retainCache,
  CacheContext,
} from './ReactFiberCacheComponent.old';

// When retrying a Suspense/Offscreen boundary, we restore the cache that was
// used during the previous render by placing it here, on the stack.
const resumedCache                            = createCursor(null);

// During the render/synchronous commit phase, we don't actually process the
// transitions. Therefore, we want to lazily combine transitions. Instead of
// comparing the arrays of transitions when we combine them and storing them
// and filtering out the duplicates, we will instead store the unprocessed transitions
// in an array and actually filter them in the passive phase.
const transitionStack                                        = createCursor(
  null,
);

function peekCacheFromPool()               {
  if (!enableCache) {
    return (null     );
  }

  // Check if the cache pool already has a cache we can use.

  // If we're rendering inside a Suspense boundary that is currently hidden,
  // we should use the same cache that we used during the previous render, if
  // one exists.
  const cacheResumedFromPreviousRender = resumedCache.current;
  if (cacheResumedFromPreviousRender !== null) {
    return cacheResumedFromPreviousRender;
  }

  // Otherwise, check the root's cache pool.
  const root = (getWorkInProgressRoot()     );
  const cacheFromRootCachePool = root.pooledCache;

  return cacheFromRootCachePool;
}

export function requestCacheFromPool(renderLanes       )        {
  // Similar to previous function, except if there's not already a cache in the
  // pool, we allocate a new one.
  const cacheFromPool = peekCacheFromPool();
  if (cacheFromPool !== null) {
    return cacheFromPool;
  }

  // Create a fresh cache and add it to the root cache pool. A cache can have
  // multiple owners:
  // - A cache pool that lives on the FiberRoot. This is where all fresh caches
  //   are originally created (TODO: except during refreshes, until we implement
  //   this correctly). The root takes ownership immediately when the cache is
  //   created. Conceptually, root.pooledCache is an Option<Arc<Cache>> (owned),
  //   and the return value of this function is a &Arc<Cache> (borrowed).
  // - One of several fiber types: host root, cache boundary, suspense
  //   component. These retain and release in the commit phase.

  const root = (getWorkInProgressRoot()     );
  const freshCache = createCache();
  root.pooledCache = freshCache;
  retainCache(freshCache);
  if (freshCache !== null) {
    root.pooledCacheLanes |= renderLanes;
  }
  return freshCache;
}

export function pushRootTransition(
  workInProgress       ,
  root           ,
  renderLanes       ,
) {
  if (enableTransitionTracing) {
    const rootTransitions = getWorkInProgressTransitions();
    push(transitionStack, rootTransitions, workInProgress);
  }
}

export function popRootTransition(
  workInProgress       ,
  root           ,
  renderLanes       ,
) {
  if (enableTransitionTracing) {
    pop(transitionStack, workInProgress);
  }
}

export function pushTransition(
  offscreenWorkInProgress       ,
  prevCachePool                         ,
  newTransitions                          ,
)       {
  if (enableCache) {
    if (prevCachePool === null) {
      push(resumedCache, resumedCache.current, offscreenWorkInProgress);
    } else {
      push(resumedCache, prevCachePool.pool, offscreenWorkInProgress);
    }
  }

  if (enableTransitionTracing) {
    if (transitionStack.current === null) {
      push(transitionStack, newTransitions, offscreenWorkInProgress);
    } else if (newTransitions === null) {
      push(transitionStack, transitionStack.current, offscreenWorkInProgress);
    } else {
      push(
        transitionStack,
        transitionStack.current.concat(newTransitions),
        offscreenWorkInProgress,
      );
    }
  }
}

export function popTransition(workInProgress       , current              ) {
  if (current !== null) {
    if (enableCache) {
      pop(resumedCache, workInProgress);
    }

    if (enableTransitionTracing) {
      pop(transitionStack, workInProgress);
    }
  }
}

export function getSuspendedTransitions()                           {
  if (!enableTransitionTracing) {
    return null;
  }

  return transitionStack.current;
}

export function getSuspendedCache()                          {
  if (!enableCache) {
    return null;
  }
  // This function is called when a Suspense boundary suspends. It returns the
  // cache that would have been used to render fresh data during this render,
  // if there was any, so that we can resume rendering with the same cache when
  // we receive more data.
  const cacheFromPool = peekCacheFromPool();
  if (cacheFromPool === null) {
    return null;
  }

  return {
    // We must also save the parent, so that when we resume we can detect
    // a refresh.
    parent: isPrimaryRenderer
      ? CacheContext._currentValue
      : CacheContext._currentValue2,
    pool: cacheFromPool,
  };
}

export function getOffscreenDeferredCache()                          {
  if (!enableCache) {
    return null;
  }

  const cacheFromPool = peekCacheFromPool();
  if (cacheFromPool === null) {
    return null;
  }

  return {
    // We must also store the parent, so that when we resume we can detect
    // a refresh.
    parent: isPrimaryRenderer
      ? CacheContext._currentValue
      : CacheContext._currentValue2,
    pool: cacheFromPool,
  };
}
