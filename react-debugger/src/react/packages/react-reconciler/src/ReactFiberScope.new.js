/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                
             
                     
               
                  
                           

import {
  getPublicInstance,
  getInstanceFromNode,
  getInstanceFromScope,
} from './ReactFiberHostConfig';
import {isFiberSuspenseAndTimedOut} from './ReactFiberTreeReflection';

import {HostComponent, ScopeComponent, ContextProvider} from './ReactWorkTags';
import {enableScopeAPI} from 'shared/ReactFeatureFlags';

function getSuspenseFallbackChild(fiber       )               {
  return ((((fiber.child     )       ).sibling     )       ).child;
}

const emptyObject = {};

function collectScopedNodes(
  node       ,
  fn                 ,
  scopedNodes            ,
)       {
  if (enableScopeAPI) {
    if (node.tag === HostComponent) {
      const {type, memoizedProps, stateNode} = node;
      const instance = getPublicInstance(stateNode);
      if (
        instance !== null &&
        fn(type, memoizedProps || emptyObject, instance) === true
      ) {
        scopedNodes.push(instance);
      }
    }
    let child = node.child;

    if (isFiberSuspenseAndTimedOut(node)) {
      child = getSuspenseFallbackChild(node);
    }
    if (child !== null) {
      collectScopedNodesFromChildren(child, fn, scopedNodes);
    }
  }
}

function collectFirstScopedNode(
  node       ,
  fn                 ,
)                {
  if (enableScopeAPI) {
    if (node.tag === HostComponent) {
      const {type, memoizedProps, stateNode} = node;
      const instance = getPublicInstance(stateNode);
      if (instance !== null && fn(type, memoizedProps, instance) === true) {
        return instance;
      }
    }
    let child = node.child;

    if (isFiberSuspenseAndTimedOut(node)) {
      child = getSuspenseFallbackChild(node);
    }
    if (child !== null) {
      return collectFirstScopedNodeFromChildren(child, fn);
    }
  }
  return null;
}

function collectScopedNodesFromChildren(
  startingChild       ,
  fn                 ,
  scopedNodes            ,
)       {
  let child = startingChild;
  while (child !== null) {
    collectScopedNodes(child, fn, scopedNodes);
    child = child.sibling;
  }
}

function collectFirstScopedNodeFromChildren(
  startingChild       ,
  fn                 ,
)                {
  let child = startingChild;
  while (child !== null) {
    const scopedNode = collectFirstScopedNode(child, fn);
    if (scopedNode !== null) {
      return scopedNode;
    }
    child = child.sibling;
  }
  return null;
}

function collectNearestContextValues   (
  node       ,
  context                 ,
  childContextValues          ,
)       {
  if (node.tag === ContextProvider && node.type._context === context) {
    const contextValue = node.memoizedProps.value;
    childContextValues.push(contextValue);
  } else {
    let child = node.child;

    if (isFiberSuspenseAndTimedOut(node)) {
      child = getSuspenseFallbackChild(node);
    }
    if (child !== null) {
      collectNearestChildContextValues(child, context, childContextValues);
    }
  }
}

function collectNearestChildContextValues   (
  startingChild              ,
  context                 ,
  childContextValues          ,
)       {
  let child = startingChild;
  while (child !== null) {
    collectNearestContextValues(child, context, childContextValues);
    child = child.sibling;
  }
}

function DO_NOT_USE_queryAllNodes(fn                 )                       {
  const currentFiber = getInstanceFromScope(this);
  if (currentFiber === null) {
    return null;
  }
  const child = currentFiber.child;
  const scopedNodes = [];
  if (child !== null) {
    collectScopedNodesFromChildren(child, fn, scopedNodes);
  }
  return scopedNodes.length === 0 ? null : scopedNodes;
}

function DO_NOT_USE_queryFirstNode(fn                 )                {
  const currentFiber = getInstanceFromScope(this);
  if (currentFiber === null) {
    return null;
  }
  const child = currentFiber.child;
  if (child !== null) {
    return collectFirstScopedNodeFromChildren(child, fn);
  }
  return null;
}

function containsNode(node        )          {
  let fiber = getInstanceFromNode(node);
  while (fiber !== null) {
    if (fiber.tag === ScopeComponent && fiber.stateNode === this) {
      return true;
    }
    fiber = fiber.return;
  }
  return false;
}

function getChildContextValues   (context                 )           {
  const currentFiber = getInstanceFromScope(this);
  if (currentFiber === null) {
    return [];
  }
  const child = currentFiber.child;
  const childContextValues = [];
  if (child !== null) {
    collectNearestChildContextValues(child, context, childContextValues);
  }
  return childContextValues;
}

export function createScopeInstance()                     {
  return {
    DO_NOT_USE_queryAllNodes,
    DO_NOT_USE_queryFirstNode,
    containsNode,
    getChildContextValues,
  };
}
