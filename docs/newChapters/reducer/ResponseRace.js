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
      //frame.sequence += `:${action[0]}_waiting...`; // todo illustrates when a function could have been called, but whose arguments was not ready.
      continue;
    if (action[3] in frame.variables) {               //goal completed, cancelling action
      frame.sequence += `:${action[0]}_c`;            // todo this and _waiting can be discovered from analysis of the actions and callSequence..
      continue;
    }
    return action;                                    //else, action is ready
  }
}

function asyncActionReturns(frame, callTxt, key, val) {
  if (key in frame.variables)
    return frame.sequence += callTxt + 'b';
  setValue(frame, callTxt, key, val);
  run(frame);
}

function setValue(frame, callTxt, key, val) {
  frame.sequence += callTxt;
  frame.variables[key] = val;
}

function run(frame) {
  //frame.sequence += `:${id}_i`; //todo
  //(re-)start state machine. This is a good sign when the state machine is triggered, either by the initial event, or by an async callback
  // this will give us a good marker in the call sequence to draw a static state for the whole system.
  // Here we can illustrate which edges have been active and which functions that have run and which functions and states are missing at this point.
  // this would be a good point to jump between too. Illustrate which events happen "simultaneously", and which steps that are slow.
  //if we do this, then I don't see the point in having a preFrame callback.
  for (let action; action = firstReadyAction(frame);) {
    const [id, params, fun, output, error] = action;
    frame.sequence += `:${id}_i`; //adding invoked. This is just a temporary placeholder, in case the runFun crashes.. so we get a debug out.
    frame.preInvoke?.call(frame);
    const result = runFun(fun, frame.variables, params);
    if (result.success instanceof Promise) {
      frame.sequence += 'a';
      result.success.then(val => asyncActionReturns(frame, `:${id}_o`, output, val));
      result.error.then(val => asyncActionReturns(frame, `:${id}_e`, error, val));
    } else if ('success' in result) {
      setValue(frame, 'o', output, result.success);
    } else /*if ('error' in result)*/ {
      setValue(frame, 'e', error, result.error);
    }
  }
  frame.postFrame?.call(frame);
}

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

export function startStack(actions, variables, debug) {
  debug && (debug = (debug instanceof Function ? debug : console.log)); //normalize debug
  const frame = {
    actions, variables, sequence: '', preInvoke: function () {
      debug(frameToString(frame));
    }
  };
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
  frame.postFrame = function () {
    debug(frameToString(frame));
    checkResponse?.call();
    checkObservers?.call();
  }
  return {response, observer};
}

//1. syntax check for dead end states. We do this by checking each action. If the action is missing a required state (ie. a required state is neither an output of any other action, or a start variable), then we remove this action. We repeat this function recursively until there are no such actions removed in an entire pass). This will remove any loose ends. This can be done at compile time.
//2. if this removes response, or any observers, then this will of course clear the way for any errors.

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