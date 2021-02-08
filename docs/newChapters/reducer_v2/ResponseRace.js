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

function checkMutations({variables}) {
  const res = {}, diff = [];
  for (let key in variables) {
    res[key] = JSON.stringify(variables[key]);
    previous[key] !== res[key] && (diff.push([key, previous[key], res[key]]));
  }
  previous = res;
  return diff;
}

export function startStack(actions, variables, preInvoke, postFrame) {
  const frame = {
    actions,
    remainingActions: actions.slice(),
    variables,
    sequence: '',
    preInvoke: frame => preInvoke.forEach(fun => fun(frame)),
    postFrame: frame => postFrame.forEach(fun => fun(frame))
  };
  run(frame);

  let response = frame.variables.response;
  if (!('response' in frame.variables) && findActionThatCanOutputResponse(actions)) {
    let resolverResponse;
    response = new Promise(r => resolverResponse = r);
    const checkResponse = () => 'response' in frame && postFrame.splice(postFrame.indexOf(checkResponse), 1) && resolverResponse(frame.response);
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

export function rrListener(actions, e, debug) {
  debug && (debug = (debug instanceof Function ? debug : console.log)); //normalize debug
  const preInvoke = [frame => debug(frameToString(frame)), checkMutations];
  const postFrame = [frame => debug(frameToString(frame)), checkMutations];
  const {response, observer} = startStack(actions, {request: e.request}, preInvoke, postFrame);
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