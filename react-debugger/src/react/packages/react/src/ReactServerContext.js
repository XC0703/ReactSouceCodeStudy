/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  REACT_PROVIDER_TYPE,
  REACT_SERVER_CONTEXT_TYPE,
  REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED,
} from "shared/ReactSymbols";

import { enableServerContext } from "shared/ReactFeatureFlags";
import ReactSharedInternals from "shared/ReactSharedInternals";

const ContextRegistry = ReactSharedInternals?.ContextRegistry;

export function createServerContext(globalName, defaultValue) {
  if (!enableServerContext) {
    throw new Error("Not implemented.");
  }
  let wasDefined = true;
  if (!ContextRegistry[globalName]) {
    wasDefined = false;
    const context = {
      $$typeof: REACT_SERVER_CONTEXT_TYPE,

      // As a workaround to support multiple concurrent renderers, we categorize
      // some renderers as primary and others as secondary. We only expect
      // there to be two concurrent renderers at most: React Native (primary) and
      // Fabric (secondary); React DOM (primary) and React ART (secondary).
      // Secondary renderers store their context values on separate fields.
      _currentValue: defaultValue,
      _currentValue2: defaultValue,

      _defaultValue: defaultValue,

      // Used to track how many concurrent renderers this context currently
      // supports within in a single renderer. Such as parallel server rendering.
      _threadCount: 0,
      // These are circular
      Provider: null,
      Consumer: null,
      _globalName: globalName,
    };

    context.Provider = {
      $$typeof: REACT_PROVIDER_TYPE,
      _context: context,
    };

    if (__DEV__) {
      let hasWarnedAboutUsingConsumer;
      context._currentRenderer = null;
      context._currentRenderer2 = null;
      Object.defineProperties(context, {
        Consumer: {
          get() {
            if (!hasWarnedAboutUsingConsumer) {
              console.error(
                "Consumer pattern is not supported by ReactServerContext"
              );
              hasWarnedAboutUsingConsumer = true;
            }
            return null;
          },
        },
      });
    }
    ContextRegistry[globalName] = context;
  }

  const context = ContextRegistry[globalName];
  if (context._defaultValue === REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED) {
    context._defaultValue = defaultValue;
    if (
      context._currentValue === REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED
    ) {
      context._currentValue = defaultValue;
    }
    if (
      context._currentValue2 === REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED
    ) {
      context._currentValue2 = defaultValue;
    }
  } else if (wasDefined) {
    throw new Error(`ServerContext: ${globalName} already defined`);
  }
  return context;
}
