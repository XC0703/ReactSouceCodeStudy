/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                                        
             
                
                             
                           
               
                         
                           

import ReactCurrentDispatcher from './ReactCurrentDispatcher';

                                        
                             

function resolveDispatcher() {
  const dispatcher = ReactCurrentDispatcher.current;
  if (__DEV__) {
    if (dispatcher === null) {
      console.error(
        'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
          ' one of the following reasons:\n' +
          '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
          '2. You might be breaking the Rules of Hooks\n' +
          '3. You might have more than one copy of React in the same app\n' +
          'See https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.',
      );
    }
  }
  // Will result in a null access error if accessed outside render phase. We
  // intentionally don't throw our own error because this is in a hot path.
  // Also helps ensure this is inlined.
  return ((dispatcher     )            );
}

export function getCacheSignal()              {
  const dispatcher = resolveDispatcher();
  // $FlowFixMe This is unstable, thus optional
  return dispatcher.getCacheSignal();
}

export function getCacheForType   (resourceType         )    {
  const dispatcher = resolveDispatcher();
  // $FlowFixMe This is unstable, thus optional
  return dispatcher.getCacheForType(resourceType);
}

export function useContext   (Context                 )    {
  const dispatcher = resolveDispatcher();
  if (__DEV__) {
    // TODO: add a more generic warning for invalid values.
    if ((Context     )._context !== undefined) {
      const realContext = (Context     )._context;
      // Don't deduplicate because this legitimately causes bugs
      // and nobody should be using this in existing code.
      if (realContext.Consumer === Context) {
        console.error(
          'Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be ' +
            'removed in a future major release. Did you mean to call useContext(Context) instead?',
        );
      } else if (realContext.Provider === Context) {
        console.error(
          'Calling useContext(Context.Provider) is not supported. ' +
            'Did you mean to call useContext(Context) instead?',
        );
      }
    }
  }
  return dispatcher.useContext(Context);
}

export function useState   (
  initialState               ,
)                                     {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}

export function useReducer         (
  reducer             ,
  initialArg   ,
  init         ,
)                   {
  const dispatcher = resolveDispatcher();
  return dispatcher.useReducer(reducer, initialArg, init);
}

export function useRef   (initialValue   )                 {
  const dispatcher = resolveDispatcher();
  return dispatcher.useRef(initialValue);
}

export function useEffect(
  create                           ,
  deps                            ,
)       {
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create, deps);
}

export function useInsertionEffect(
  create                           ,
  deps                            ,
)       {
  const dispatcher = resolveDispatcher();
  return dispatcher.useInsertionEffect(create, deps);
}

export function useLayoutEffect(
  create                           ,
  deps                            ,
)       {
  const dispatcher = resolveDispatcher();
  return dispatcher.useLayoutEffect(create, deps);
}

export function useCallback   (
  callback   ,
  deps                            ,
)    {
  const dispatcher = resolveDispatcher();
  return dispatcher.useCallback(callback, deps);
}

export function useMemo   (
  create         ,
  deps                            ,
)    {
  const dispatcher = resolveDispatcher();
  return dispatcher.useMemo(create, deps);
}

export function useImperativeHandle   (
  ref                                                                   ,
  create         ,
  deps                            ,
)       {
  const dispatcher = resolveDispatcher();
  return dispatcher.useImperativeHandle(ref, create, deps);
}

export function useDebugValue   (
  value   ,
  formatterFn                      ,
)       {
  if (__DEV__) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useDebugValue(value, formatterFn);
  }
}

export const emptyObject = {};

export function useTransition()   
          
                                                                   
  {
  const dispatcher = resolveDispatcher();
  return dispatcher.useTransition();
}

export function useDeferredValue   (value   )    {
  const dispatcher = resolveDispatcher();
  return dispatcher.useDeferredValue(value);
}

export function useId()         {
  const dispatcher = resolveDispatcher();
  return dispatcher.useId();
}

export function useMutableSource                  (
  source                       ,
  getSnapshot                                              ,
  subscribe                                            ,
)           {
  const dispatcher = resolveDispatcher();
  return dispatcher.useMutableSource(source, getSnapshot, subscribe);
}

export function useSyncExternalStore   (
  subscribe                            ,
  getSnapshot         ,
  getServerSnapshot          ,
)    {
  const dispatcher = resolveDispatcher();
  return dispatcher.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}

export function useCacheRefresh()                            {
  const dispatcher = resolveDispatcher();
  // $FlowFixMe This is unstable, thus optional
  return dispatcher.useCacheRefresh();
}
