/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

export function addEventBubbleListener(
  target             ,
  eventType        ,
  listener          ,
)           {
  target.addEventListener(eventType, listener, false);
  return listener;
}

export function addEventCaptureListener(
  target             ,
  eventType        ,
  listener          ,
)           {
  target.addEventListener(eventType, listener, true);
  return listener;
}

export function addEventCaptureListenerWithPassiveFlag(
  target             ,
  eventType        ,
  listener          ,
  passive         ,
)           {
  target.addEventListener(eventType, listener, {
    capture: true,
    passive,
  });
  return listener;
}

export function addEventBubbleListenerWithPassiveFlag(
  target             ,
  eventType        ,
  listener          ,
  passive         ,
)           {
  target.addEventListener(eventType, listener, {
    passive,
  });
  return listener;
}

export function removeEventListener(
  target             ,
  eventType        ,
  listener          ,
  capture         ,
)       {
  target.removeEventListener(eventType, listener, capture);
}
