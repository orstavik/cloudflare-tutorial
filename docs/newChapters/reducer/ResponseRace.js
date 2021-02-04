
//optimizations.
// 1. optimize actions run. Remove from the list the actions already processed?
// 1. optimize variable resolution. This is done from scratch again and again.

//att! mutates the actions list!
function syntaxCheck(actions) {
  let hasResponse, observers = [];
  for (let i = 0; i < actions.length; i++) {
    let action = actions[i];
    if (action[2] === 'response')
      hasResponse = true;
    if (action.length === 2) {
      observers.push(i);
      action.push('_observer' + i);
      action.push('_error' + i);
    } else if (action.length === 3)
      action.push('_error' + i);
  }
  return {hasResponse, observers};
}

function checkOutObserver(unresolvedObservers, actionId) {
  const index = unresolvedObservers.indexOf(actionId);
  if (index !== -1)
    unresolvedObservers.splice(index, 1);
  return !unresolvedObservers.length;
}

function setDynamicVariable(frame, prop, value, actionId) {
  frame.variables[prop] = value;
  prop === 'response' && frame.resolverResponse && frame.resolverResponse(value);
  frame.unresolvedObservers && checkOutObserver(frame.unresolvedObservers, actionId) && frame.resolverObservers(true);
}

//returns either two Promises or either only success(not a Promise) or error (not a Promise)
function runFun(fun, variables, params) {
  try {
    const args = params.map(p => variables[p[0] === '*' ? p.substr(0) : p]);
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

function doDebug(debug, actions, context, sequence) {
  !(debug instanceof Function) && (debug = console.log);
  actions = actions.map(([params, fun, output, error]) => [params, fun.name, output, error]);//be careful not to mutate actions here..
  const variables = {...context};
  for (let [key, value] of Object.entries(context))
    variables[key] = value === undefined ? null : value;
  debug(btoa(JSON.stringify({actions, sequence, variables})));
}

function run(frame) {
  const {actions, variables, debug, sequence} = frame;
  debug && doDebug(debug, actions, variables, sequence);
  for (let i = 0; i < actions.length; i++) {
    if (sequence.find(call => call.startsWith(i + '_'))) //action already run
      continue;
    let [params, fun, prop, propError] = actions[i];
    if (prop in variables) {                             //goal completed, cancelling action
      sequence.push(i + '_c');
      continue;
    }
    if (params.find(arg => arg[0] !== '*' && !(arg in variables)))  //action not ready: find unset, not-* arg
      continue;
    sequence.push(i + '_i'); //adding invoked. This is just a temporary placeholder, in case the runFun crashes.. so we get a debug out.
    //todo I think we need to doDebug here too.. #1 // debug && doDebug(debug, actions, variables, sequence);
    const result = runFun(fun, variables, params);
    if (result.success instanceof Promise) {
      sequence[sequence.length - 1] += 'a'; //todo
      //todo I think we need to doDebug here too.. #2 // debug && doDebug(debug, actions, variables, sequence);
      result.success.then(s => {
        if (variables[prop])                //if the property is already filled, and the set is blocked, then no new frame will run.
          return sequence.push(i + '_ob'); //type is 'ae' for async error, 'a' async result, '' sync result, 'e' sync error
        sequence.push(i + '_o');
        setDynamicVariable(frame, prop, s, i);
        run(frame);
      });
      result.error.then(e => {
        if (variables[propError])           //if the property is already filled, and the set is blocked, then no new frame will run.
          return sequence.push(i + '_eb'); //type is 'ae' for async error, 'a' async result, '' sync result, 'e' sync error
        sequence.push(i + '_e');
        setDynamicVariable(frame, propError, e, i);
        run(frame);
      });
    } else if ('success' in result) {
      sequence[sequence.length - 1] += 'o'; //todo
      setDynamicVariable(frame, prop, result.success, i);
      return run(frame);    //TCO
    } else /*if ('error' in result)*/ {
      sequence[sequence.length - 1] += 'e';  //todo
      setDynamicVariable(frame, propError, result.error, i);
      return run(frame); //TCO
    }
  }
  //todo if no action is added to the initial input, we have a dead end. This can be syntax checked.
  //todo the observers and the response might not be disconnected along the way. This can also be syntax checked, if error leads to nowhere. But, this might and might not happen. So this is also best to check for run-time.
  //todo This means that we at this end point need to check to see if there are no unresolved issues.
  //todo here we would need to dispatch an error maybe..
}

export function startStack(actions, startState, debug) {
  const {hasResponse, observers} = syntaxCheck(actions);
  const frame = {actions, variables: startState, debug, sequence: []};
  run(frame);
  let response = undefined;
  if ('response' in frame.variables) {
    response = frame.variables.response;
  } else if (hasResponse) {
    let resolverResponse;
    response = new Promise(r => resolverResponse = r);
    frame.resolverResponse = resolverResponse;
  }
  let observer = undefined;
  const unresolvedObservers = observers.filter(obsNum => !("_observer" + obsNum in frame.variables || "_error" + obsNum in frame.variables));
  if (unresolvedObservers.length) {
    let resolverObservers;
    observer = new Promise(r => resolverObservers = r);
    frame.resolverObservers = resolverObservers;
    frame.unresolvedObservers = unresolvedObservers;
  }
  return {response, observer};
}

export function rrListener(actions, e, debug) {
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

