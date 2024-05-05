/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                      
                                                

import {enableDebugTracing} from 'shared/ReactFeatureFlags';

const nativeConsole         = console;
let nativeConsoleLog                  = null;

const pendingGroupArgs             = [];
let printedGroupIndex         = -1;

function formatLanes(laneOrLanes              )         {
  return '0b' + (laneOrLanes     ).toString(2).padStart(31, '0');
}

function group(...groupArgs)       {
  pendingGroupArgs.push(groupArgs);

  if (nativeConsoleLog === null) {
    nativeConsoleLog = nativeConsole.log;
    nativeConsole.log = log;
  }
}

function groupEnd()       {
  pendingGroupArgs.pop();
  while (printedGroupIndex >= pendingGroupArgs.length) {
    nativeConsole.groupEnd();
    printedGroupIndex--;
  }

  if (pendingGroupArgs.length === 0) {
    nativeConsole.log = nativeConsoleLog;
    nativeConsoleLog = null;
  }
}

function log(...logArgs)       {
  if (printedGroupIndex < pendingGroupArgs.length - 1) {
    for (let i = printedGroupIndex + 1; i < pendingGroupArgs.length; i++) {
      const groupArgs = pendingGroupArgs[i];
      nativeConsole.group(...groupArgs);
    }
    printedGroupIndex = pendingGroupArgs.length - 1;
  }
  if (typeof nativeConsoleLog === 'function') {
    nativeConsoleLog(...logArgs);
  } else {
    nativeConsole.log(...logArgs);
  }
}

const REACT_LOGO_STYLE =
  'background-color: #20232a; color: #61dafb; padding: 0 2px;';

export function logCommitStarted(lanes       )       {
  if (__DEV__) {
    if (enableDebugTracing) {
      group(
        `%c⚛️%c commit%c (${formatLanes(lanes)})`,
        REACT_LOGO_STYLE,
        '',
        'font-weight: normal;',
      );
    }
  }
}

export function logCommitStopped()       {
  if (__DEV__) {
    if (enableDebugTracing) {
      groupEnd();
    }
  }
}

const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;
// $FlowFixMe: Flow cannot handle polymorphic WeakMaps
const wakeableIDs                            = new PossiblyWeakMap();
let wakeableID         = 0;
function getWakeableID(wakeable          )         {
  if (!wakeableIDs.has(wakeable)) {
    wakeableIDs.set(wakeable, wakeableID++);
  }
  return ((wakeableIDs.get(wakeable)     )        );
}

export function logComponentSuspended(
  componentName        ,
  wakeable          ,
)       {
  if (__DEV__) {
    if (enableDebugTracing) {
      const id = getWakeableID(wakeable);
      const display = (wakeable     ).displayName || wakeable;
      log(
        `%c⚛️%c ${componentName} suspended`,
        REACT_LOGO_STYLE,
        'color: #80366d; font-weight: bold;',
        id,
        display,
      );
      wakeable.then(
        () => {
          log(
            `%c⚛️%c ${componentName} resolved`,
            REACT_LOGO_STYLE,
            'color: #80366d; font-weight: bold;',
            id,
            display,
          );
        },
        () => {
          log(
            `%c⚛️%c ${componentName} rejected`,
            REACT_LOGO_STYLE,
            'color: #80366d; font-weight: bold;',
            id,
            display,
          );
        },
      );
    }
  }
}

export function logLayoutEffectsStarted(lanes       )       {
  if (__DEV__) {
    if (enableDebugTracing) {
      group(
        `%c⚛️%c layout effects%c (${formatLanes(lanes)})`,
        REACT_LOGO_STYLE,
        '',
        'font-weight: normal;',
      );
    }
  }
}

export function logLayoutEffectsStopped()       {
  if (__DEV__) {
    if (enableDebugTracing) {
      groupEnd();
    }
  }
}

export function logPassiveEffectsStarted(lanes       )       {
  if (__DEV__) {
    if (enableDebugTracing) {
      group(
        `%c⚛️%c passive effects%c (${formatLanes(lanes)})`,
        REACT_LOGO_STYLE,
        '',
        'font-weight: normal;',
      );
    }
  }
}

export function logPassiveEffectsStopped()       {
  if (__DEV__) {
    if (enableDebugTracing) {
      groupEnd();
    }
  }
}

export function logRenderStarted(lanes       )       {
  if (__DEV__) {
    if (enableDebugTracing) {
      group(
        `%c⚛️%c render%c (${formatLanes(lanes)})`,
        REACT_LOGO_STYLE,
        '',
        'font-weight: normal;',
      );
    }
  }
}

export function logRenderStopped()       {
  if (__DEV__) {
    if (enableDebugTracing) {
      groupEnd();
    }
  }
}

export function logForceUpdateScheduled(
  componentName        ,
  lane      ,
)       {
  if (__DEV__) {
    if (enableDebugTracing) {
      log(
        `%c⚛️%c ${componentName} forced update %c(${formatLanes(lane)})`,
        REACT_LOGO_STYLE,
        'color: #db2e1f; font-weight: bold;',
        '',
      );
    }
  }
}

export function logStateUpdateScheduled(
  componentName        ,
  lane      ,
  payloadOrAction     ,
)       {
  if (__DEV__) {
    if (enableDebugTracing) {
      log(
        `%c⚛️%c ${componentName} updated state %c(${formatLanes(lane)})`,
        REACT_LOGO_STYLE,
        'color: #01a252; font-weight: bold;',
        '',
        payloadOrAction,
      );
    }
  }
}
