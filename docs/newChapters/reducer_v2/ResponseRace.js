import {run} from "./statemachine.js";

//this is a universal function. The convention is as follows:
//If the response is undefined, or resolves to undefined, then the fetchEvent will pass the request to the sub system.
//If the response is an Error or resolves to an Error, then the method will also throw an Error (without triggering the fetchEvent.passThroughOnException().
//For all other instances, the response will be passed to the system as (the basis for an) HTTP Response.
//The method fetchEvent.waitUntil will be called for the observer. The fetchEvent will not conclude until this Promise resolves.
function handleResponse(fetchEvent, response, observer) {
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


function findUnresolvedObserver({actions, variables}) {
  return actions.find(([id, p, f, output, error]) => output.startsWith('_observer_') && !(output in variables) && !(error in variables));
}

function findActionThatCanOutputResponse(actions) {
  return actions.find(([i, p, f, o, e]) => o === 'response' || e === 'response');
}

function frameToString({actions, variables: context, sequence}) {
  actions = actions.map(([id, params, fun, output, error]) => [params.map(p => p instanceof Object ? p.op + p.key : typeof (p) === 'string' ? JSON.stringify(p) : p), fun.name, output, error]);
  const variables = {};
  for (let key in context)
    variables[key] = context[key] === undefined ? null : context[key];
  return btoa(JSON.stringify({actions, sequence, variables}));
}

let previous = {};

function checkMutations({variables}) {
  const res = {}, diff = [];
  for (let key in variables) {
    res[key] = JSON.stringify(variables[key]);
    previous[key] !== res[key] && (diff.push([key, previous[key], res[key]]));
  }
  previous = res;
  return diff;
}

function stateMachine(actions, variables, debug, doCheckMutations) {
  //setting up debug and checkMutations callbacks
  const preInvoke = [];
  debug && (debug = (debug instanceof Function ? debug : console.log)); //normalize debug
  debug && preInvoke.push(frame => debug(frameToString(frame)));
  doCheckMutations && preInvoke.push(frame => {
    const diff = checkMutations(frame);
    if (diff.length > 1)
      debug("Mutation!! " + JSON.stringify(diff));
  });
  const postFrame = preInvoke.slice();

  const frame = {actions, remainingActions: actions.slice(), variables, sequence: '', preInvoke, postFrame};
  run(frame);

  //setting up response and observer callbacks
  let response = variables.response;
  if (!('response' in variables) && findActionThatCanOutputResponse(actions)) {
    let resolverResponse;
    response = new Promise(r => resolverResponse = r);
    const checkResponse = () => 'response' in variables && postFrame.splice(postFrame.indexOf(checkResponse), 1) && resolverResponse(variables.response);
    postFrame.push(checkResponse);
  }
  let observer;
  if (findUnresolvedObserver(frame)) {
    let resolverObservers;
    observer = new Promise(r => resolverObservers = r);
    const checkObservers = () => !findUnresolvedObserver(frame) && postFrame.splice(postFrame.indexOf(checkObservers, 1)) && resolverObservers(true);
    postFrame.push(checkObservers);
  }

  return {response, observer};
}

export function rrListener(actions, e, debug, doCheckMutations) {
  const {response, observer} = stateMachine(actions, {request: e.request}, debug, doCheckMutations);
  return handleResponse(e, response, observer);
}