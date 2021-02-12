import {run} from "./statemachine.js";

//todo this function should be moved into a different folder.
// this is a universal function. The convention is as follows:
//If the response is undefined, or resolves to undefined, then the fetchEvent will pass the request to the sub system.
//If the response is an Error or resolves to an Error, then the method will also throw an Error (without triggering the fetchEvent.passThroughOnException().
//For all other instances, the response will be passed to the system as (the basis for an) HTTP Response.
//The method fetchEvent.waitUntil will be called for the observer. The fetchEvent will not conclude until this Promise resolves.
export function handleResponse(fetchEvent, response, observer) {
  observer && fetchEvent.waitUntil(observer);
  if (response === undefined)
    return;
  if (response instanceof Error)
    throw response;
  if (!(response instanceof Promise))
    return fetchEvent.respondWith(response);
  fetchEvent.respondWith(async function () {
    const result = await response;
    if (result === undefined) {
      fetchEvent.passThroughOnException();      //pass through to subsystem CDN
      throw new Error('passing the request to the CDN subsystem.');
    }
    if (result instanceof Error)
      throw result;
    return result;
  }());
}

function findUnresolvedObserver({actions, state}) {
  return actions.find(([id, p, f, output, error]) => output.startsWith('_observer_') && !(output in state) && !(error in state));
}

function findActionThatCanOutputResponse(actions) {
  return actions.find(([i, p, f, o, e]) => o === 'response' || e === 'response');
}

//The stateMachine a) starts the inner statemachine and b) monitors the state of the response and observers.
export function stateMachine(actions, state, cbs) {
  // const postFrame = cbs.slice();
  const tracers = {'i': cbs, 'e': cbs, 'o': cbs};
  const onTrace = function (frame, txt) {
    for (let [key, tras] of Object.entries(tracers)) {
      if (txt.indexOf(key) >= 0 && tras instanceof Array)        //todo this is very inefficient currently. Bad format for writing the query.
        tras.forEach(fun => fun(frame));
    }
  }

  const frame = {actions, remainingActions: actions.slice(), state, trace: []/*, cbs, postFrame*/, onTrace};
  run(frame);

  //setting up response and observer callbacks
  let response = state.response;
  if (!('response' in state) && findActionThatCanOutputResponse(actions)) {
    let resolverResponse;
    response = new Promise(r => resolverResponse = r);
    tracers.r = [()=> resolverResponse(state.response)];
    // const checkResponse = () => 'response' in state && postFrame.splice(postFrame.indexOf(checkResponse), 1) && resolverResponse(state.response);
    // postFrame.push(checkResponse);
  }
  let observer;
  if (findUnresolvedObserver(frame)) {
    let resolverObservers;
    observer = new Promise(r => resolverObservers = r);
    tracers.l = [()=>resolverObservers(true)];
    // const checkObservers = () => !findUnresolvedObserver(frame) && postFrame.splice(postFrame.indexOf(checkObservers, 1)) && resolverObservers(true);
    // postFrame.push(checkObservers);
  }

  return {response, observer};
}