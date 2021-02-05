
//returns either two Promises or either only success(not a Promise) or error (not a Promise)
function runFun(fun, variables, params) {
  try {
    const args = params.map(p => variables[p[0] === '*' ? p.substr(0) : p]);  //optimize argument resolution? Maybe not..
    const res = fun(...args);
    if (!(res instanceof Promise))
      return {success: res};
    let successResolver, errorResolver;
    const success = new Promise(r => successResolver = r), error = new Promise(r => errorResolver = r);
    res.then(v => successResolver(v), e => errorResolver(e));
    return {success, error};
  } catch (err) {
    return {error: err};
  }
}

function firstReadyAction(frame) {
  for (let action of frame.actions) {
    if (frame.sequence.indexOf(`:${action[0]}_`) >= 0) continue;          //action already invoked
    if (action[1].find(p => !(p[0] === '*' || p in frame.variables)))     //required arguments not yet ready
      //frame.sequence += `:${action[0]}_waiting...`;
      // todo should we illustrate when a function is not yet called? This can be discovered implicitly by reviewing the call stack
      continue;
    if (action[3] in frame.variables) {                                   //goal completed, cancelling action
      // todo It is possible to discover that a call has been made by reviewing the call stack.. move this complexity into the view?
      frame.sequence += `:${action[0]}_c`;
      continue;
    }
    return action;                                                  //else, action is ready
  }
}

function asyncActionReturns(frame, id, type, output, val) {
  if (output in frame.variables)
    return frame.sequence += `:${id}_${type}b`;
  frame.sequence += `:${id}_${type}`;
  frame.variables[output] = val;
  run(frame);
}

function run(frame) {
  //todo preFrame?
  for (let action; action = firstReadyAction(frame);) {
    const [id, params, fun, output, error] = action;
    frame.sequence += `:${id}_i`; //adding invoked. This is just a temporary placeholder, in case the runFun crashes.. so we get a debug out.

    //todo preInvoke
    //todo, this function could be controlled from postSet and preInvoke
    frame.debug && frame.debug(frameToString(frame));
    const result = runFun(fun, frame.variables, params);
    if (result.success instanceof Promise) {
      frame.sequence += 'a';
      result.success.then(val => asyncActionReturns(frame, id, 'o', output, val));
      result.error.then(val => asyncActionReturns(frame, id, 'e', error, val));
    } else if ('success' in result) {
      frame.sequence += 'o';
      frame.variables[output] = result.success;
    } else /*if ('error' in result)*/ {
      frame.sequence += 'e';
      frame.variables[error] = result.error;
    }
  }
  //todo postFrame
  //todo, this function could be controlled from postSet and preInvoke
  frame.debug && frame.debug(frameToString(frame));
  frame.checkResponse && frame.checkResponse();
  frame.checkObservers && frame.checkObservers();
}

//todo if no action is added to the initial input, we have a dead end. This can be syntax checked.
//todo the observers and the response might not be disconnected along the way. This can also be syntax checked, if error leads to nowhere. But, this might and might not happen. So this is also best to check for run-time.
//todo This means that we at this end point need to check to see if there are no unresolved issues.
//todo here we would need to dispatch an error maybe..

function findUnresolvedObserver({actions, variables}) {
  return actions.find(([id, p, f, output, error]) => output.startsWith('_observer_') && !(output in variables) && !(error in variables));
}

function findActionThatCanOutputResponse(actions) {
  return actions.find(([i, p, f, o, e]) => o === 'response' || e === 'response');
}

function normalizeIdObserversMissingErrors(actions) {
  return actions.map((a, i) => (a = [i, ...a], (a.length === 3 && a.push(`_observer_${i}`)), (a.length === 4 && a.push(`_error_${i}`)), a));
}

//be careful not to mutate actions here..
function frameToString({actions, variables: context, sequence}) {
  actions = actions.map(([id, params, fun, output, error]) => [params, fun.name, output, error]);
  const variables = {...context};
  for (let [key, value] of Object.entries(context))
    variables[key] = value === undefined ? null : value;
  sequence = sequence.split(':').slice(1);                         //todo pass the sequence as a string, not an array
  return btoa(JSON.stringify({actions, sequence, variables}));
}

export function startStack(actions, startState, debug) {
  const frame = {actions, variables: startState, sequence: ''};
  debug && (frame.debug = (debug instanceof Function ? debug : console.log)); //normalize frame.debug
  run(frame);
  let response = frame.variables.response;
  if (!('response' in frame.variables) && findActionThatCanOutputResponse(actions)) {
    let resolverResponse;
    response = new Promise(r => resolverResponse = r);
    frame.checkResponse = () => ('response' in frame && delete frame.checkResponse, resolverResponse(frame.response));
  }
  let observer;
  if(findUnresolvedObserver(frame)){
    let resolverObservers;
    observer = new Promise(r => resolverObservers = r);
    frame.checkObservers = () => (!findUnresolvedObserver(frame) && delete frame.checkObservers, resolverObservers(true));    //todo here we could return the list of all observers output, like allSettled would do..
  }
  return {response, observer};
}

export function rrListener(actions, e, debug) {
  actions = normalizeIdObserversMissingErrors(actions); //todo moved up init time
  const {response, observer} = startStack(actions, {request: e.request}, debug);
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