function firstReadyAction(frame) {
  main: for (let action of frame.actions) {
    let [id, params, _, output] = action;
    if (frame.sequence.indexOf(`:${id}_`) >= 0)            //action already invoked
      continue;
    if (output in frame.variables) {                       //goal completed, cancelling action
      frame.sequence += `:${id}_c`;     //todo _waiting can be read through analysis of actions and callSequence..
      continue;
    }
    const args = [];
    for (let p of params) {
      if (p[0] === '*')
        args.push(frame.variables[p.substr(1)]);
      else if (p in frame.variables)
        args.push(frame.variables[p]);
      else
        //frame.sequence += `:${action[0]}_waiting...`;   // todo illustrates when a function could have been called, but whose arguments was not ready.
        continue main;                                    //required arguments not yet ready
    }
    return {action, args};                                //else, action is ready
  }
  return {};
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
  //todo
  //frame.sequence += `:${id}_i`;
  //(re-)start state machine. This is a good sign when the state machine is triggered, either by the initial event, or by an async callback
  // this will give us a good marker in the call sequence to draw a static state for the whole system.
  // Here we can illustrate which edges have been active and which functions that have run and which functions and states are missing at this point.
  // this would be a good point to jump between too. Illustrate which events happen "simultaneously", and which steps that are slow.
  //if we do this, then I don't see the point in having a preFrame callback.
  for (let action, args; {action, args} = firstReadyAction(frame), action;) {
    let [id, _, fun, output, error] = action;
    frame.preInvoke?.call(frame);

    let result;
    for (let operator in frame.operators) {
      if (output.startsWith(operator)) {
        output = output.substr(operator.length);
        result = frame.operators[operator](fun, args, frame, id, output);
        break;
      }
    }
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
  const variables = {};
  for (let key in context)
    variables[key] = context[key] === undefined ? null : context[key];
  return btoa(JSON.stringify({actions, sequence, variables}));
}

export function startStack(actions, operators, variables, debug) {
  debug && (debug = (debug instanceof Function ? debug : console.log)); //normalize debug
  const frame = {
    actions, operators, variables, sequence: '', preInvoke: function () {
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

// todo
// 1. syntax check for dead end states. We do this by checking each action. If the action is missing a required state (ie. a required state is neither an output of any other action, or a start variable), then we remove this action. We repeat this function recursively until there are no such actions removed in an entire pass). This will remove any loose ends. This can be done at compile time.
//2. if this removes response, or any observers, then this will of course clear the way for any errors.


//returns either two Promises or either only success(not a Promise) or error (not a Promise)
function runFun(fun, args, frame, id) {
  frame.sequence += `:${id}_i`; //adding invoked. This is just a temporary placeholder, in case the runFun crashes.. so we get a debug out.
  try {
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

function getOperators(c) {
  const cache = c;
  const operators = {
    '': runFun,
    '!': function (fun, args, frame, id, output) {
      cache[output] || (cache[output] = {});
      debugger
      const key = JSON.stringify(args.length === 1 ? args[0] : args);
      if (key.length === Infinity) //todo what is the potential problems here??
        return runFun(fun, args, frame, id);
      if (key in cache[output]) {
        frame.sequence += `:${id}_!o`;  //marking the data as coming out of the cache.
        return cache[output][key];
      } else {
        const result = runFun(fun, args, frame, id);
        frame.sequence += `:${id}_!i`;   //marking the data as coming out of the cache.
        return cache[output][key] = result;
      }
    }
  }
  // must be sorted longest operator first..
  return Object.fromEntries(Object.entries(operators).sort(([a], [b]) => a.length > b.length ? -1 : a.length === b.length ? 0 : 1));
}

export function rrListener(actions, e, debug, cache) {
  actions = normalizeIdObserversMissingErrors(actions); //todo moved up init time
  const {response, observer} = startStack(actions, getOperators(cache), {request: e.request}, debug);
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