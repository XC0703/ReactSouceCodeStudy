/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                

import {getStackByFiberInDevAndProd} from './ReactFiberComponentStack';

                                 
           
                       
                       
                        
   

export function createCapturedValueAtFiber   (
  value   ,
  source       ,
)                   {
  // If the value is an error, call this function immediately after it is thrown
  // so the stack is accurate.
  return {
    value,
    source,
    stack: getStackByFiberInDevAndProd(source),
    digest: null,
  };
}

export function createCapturedValue   (
  value   ,
  digest         ,
  stack         ,
)                   {
  return {
    value,
    source: null,
    stack: stack != null ? stack : null,
    digest: digest != null ? digest : null,
  };
}
