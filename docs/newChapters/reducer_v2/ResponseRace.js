import {run} from "./statemachine.js";

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

function checkMutations(obj) {
  const res = {}, diff = {};
  for (let key in obj) {
    res[key] = JSON.stringify(obj[key]);
    previous[key] !== res[key] && (diff[key] = [previous[key], res[key]]);
  }
  previous = res;
  return diff;
}

export function startStack(actions, variables, debug, preInvoke) {
  //todo use a proxy for variables, to capture the setting of response and _observer_?
  const frame = {actions, variables, sequence: '', preInvoke};
  run(frame);
  let response = frame.variables.response, checkResponse;
  if (!('response' in frame.variables) && findActionThatCanOutputResponse(actions)) {
    let resolverResponse;
    response = new Promise(r => resolverResponse = r);
    checkResponse = () => ('response' in frame && (checkResponse = undefined), resolverResponse(frame.response));
  }
  let observer, checkObservers;  //todo here we could return the list of all observers output, like allSettled would do..
  if (findUnresolvedObserver(frame)) {    //todo we would do this by making findUnresolvedObservers into observerStatus
    let resolverObservers;
    observer = new Promise(r => resolverObservers = r);
    checkObservers = () => (!findUnresolvedObserver(frame) && (checkObservers = undefined), resolverObservers(true));
  }
  frame.postFrame = function (frame) {
    debug(frameToString(frame));
    checkResponse?.call();
    checkObservers?.call();
    checkMutations(frame.variables);
  };
  return {response, observer};
}

export function rrListener(actions, e, debug) {
  const preInvoke = function (frame) {
    debug(frameToString(frame));
    checkMutations(frame.variables);
  };
  debug && (debug = (debug instanceof Function ? debug : console.log)); //normalize debug
  const {response, observer} = startStack(actions, {request: e.request}, debug, preInvoke);
  observer && e.waitUntil(observer);
  if (response === undefined)
    return;
  if (response instanceof Error)
    throw response;
  if (!(response instanceof Promise))
    return e.respondWith(response);
  e.respondWith(async function () {
    const result = await response;
    if (result === undefined) {
      e.passThroughOnException();      //pass through to subsystem CDN
      throw new Error('passing the request to the CDN subsystem.');
    }
    if (result instanceof Error)
      throw result;
    return result;
  }());
}