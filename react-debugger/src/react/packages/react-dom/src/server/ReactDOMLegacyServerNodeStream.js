/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                     

                                                              

import {
  createRequest,
  startWork,
  startFlowing,
  abort,
} from 'react-server/src/ReactFizzServer';

import {
  createResponseState,
  createRootFormatContext,
} from './ReactDOMServerLegacyFormatConfig';

import {Readable} from 'stream';

                      
                            
  

class ReactMarkupReadableStream extends Readable {
  request         ;
  startedFlowing         ;
  constructor() {
    // Calls the stream.Readable(options) constructor. Consider exposing built-in
    // features like highWaterMark in the future.
    super({});
    this.request = (null     );
    this.startedFlowing = false;
  }

  _destroy(err, callback) {
    abort(this.request);
    // $FlowFixMe: The type definition for the callback should allow undefined and null.
    callback(err);
  }

  _read(size) {
    if (this.startedFlowing) {
      startFlowing(this.request, this);
    }
  }
}

function onError() {
  // Non-fatal errors are ignored.
}

function renderToNodeStreamImpl(
  children               ,
  options                      ,
  generateStaticMarkup         ,
)           {
  function onAllReady() {
    // We wait until everything has loaded before starting to write.
    // That way we only end up with fully resolved HTML even if we suspend.
    destination.startedFlowing = true;
    startFlowing(request, destination);
  }
  const destination = new ReactMarkupReadableStream();
  const request = createRequest(
    children,
    createResponseState(false, options ? options.identifierPrefix : undefined),
    createRootFormatContext(),
    Infinity,
    onError,
    onAllReady,
    undefined,
    undefined,
  );
  destination.request = request;
  startWork(request);
  return destination;
}

function renderToNodeStream(
  children               ,
  options                ,
)           {
  if (__DEV__) {
    console.error(
      'renderToNodeStream is deprecated. Use renderToPipeableStream instead.',
    );
  }
  return renderToNodeStreamImpl(children, options, false);
}

function renderToStaticNodeStream(
  children               ,
  options                ,
)           {
  return renderToNodeStreamImpl(children, options, true);
}

export {renderToNodeStream, renderToStaticNodeStream};
