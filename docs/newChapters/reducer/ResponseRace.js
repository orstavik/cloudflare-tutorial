function normalizeIdObserversMissingErrors(actions) {
  return actions.map((a, i) => (a = [i, ...a], (a.length === 3 && a.push(`_observer_${i}`)), (a.length === 4 && a.push(`_error_${i}`)), a));
}

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

function doDebug(debug, actions, context, sequence) {           //todo, this function could be controlled from postSet and preInvoke
  !(debug instanceof Function) && (debug = console.log);
  actions = actions.map(([id, params, fun, output, error]) => [params, fun.name, output, error]);//be careful not to mutate actions here..
  const variables = {...context};
  for (let [key, value] of Object.entries(context))
    variables[key] = value === undefined ? null : value;
  const debugObj = {actions, sequence: sequence.split(':').slice(1), variables};     //todo pass the sequence as a string, not an array
  debug(btoa(JSON.stringify(debugObj)));
}

function nextReadyAction(actions, frame, variables) {
  for (let action of actions) {
    if (frame.sequence.indexOf(`:${action[0]}_`) >= 0) continue;    //action already invoked
    if (action[1].find(p => !(p[0] === '*' || p in variables)))     //required arguments not yet ready
      //frame.sequence += `:${action[0]}_waiting...`;
      // todo should we illustrate when a function is not yet called? This can be discovered implicitly by reviewing the call stack
      continue;
    if (action[3] in variables) {                                   //goal completed, cancelling action
      // todo It is possible to discover that a call has been made by reviewing the call stack.. move this complexity into the view?
      frame.sequence += `:${action[0]}_c`;
      continue;
    }
    return action;                                                  //else, action is ready
  }
}

function run(frame) {
  const {actions, variables, debug, sequence} = frame;
  debug && doDebug(debug, actions, variables, sequence);
  // let action;
  for (let action; action = nextReadyAction(actions, frame, variables);) {
    let [id, params, fun, prop, propError] = action;
    frame.sequence += ':'+id + '_i'; //adding invoked. This is just a temporary placeholder, in case the runFun crashes.. so we get a debug out.
    //todo I think we need to doDebug here too.. #1 // debug && doDebug(debug, actions, variables, sequence);
    //todo make a method, beforeInvoke
    const result = runFun(fun, variables, params);
    if (result.success instanceof Promise) {
      frame.sequence += 'a';
      //todo I think we need to doDebug here too.. #2 // debug && doDebug(debug, actions, variables, sequence);
      result.success.then(val => {
        frame.sequence += `:${id}_o`;
        if (prop in variables)
          return frame.sequence += 'b';
        frame.variables[prop] = val;
        frame.afterSet && frame.afterSet(frame);
        run(frame);
      });
      result.error.then(val => {
        frame.sequence += `:${id}_e`;
        if (propError in variables)
          return frame.sequence += 'b';
        frame.variables[propError] = val;
        frame.afterSet && frame.afterSet(frame);
        run(frame);
      });
    } else if ('success' in result) {
      frame.sequence += 'o';
      frame.variables[prop] = result.success;
      frame.afterSet && frame.afterSet(frame);
    } else /*if ('error' in result)*/ {
      frame.sequence += 'e';
      frame.variables[propError] = result.error;
      frame.afterSet && frame.afterSet(frame);
    }
  }
  //todo if no action is added to the initial input, we have a dead end. This can be syntax checked.
  //todo the observers and the response might not be disconnected along the way. This can also be syntax checked, if error leads to nowhere. But, this might and might not happen. So this is also best to check for run-time.
  //todo This means that we at this end point need to check to see if there are no unresolved issues.
  //todo here we would need to dispatch an error maybe..
}

function afterSet(frame) {
  'response' in frame.variables && frame.resolverResponse && frame.resolverResponse(frame.variables.response), delete frame.resolverResponse;
  if(frame.resolverObservers) {
    const openObservers = frame.actions.filter(([id, p, f, output, error])=>output.startsWith('_observer_') && !(output in frame.variables) && !(error in frame.variables));
    if(openObservers.length === 0){
      frame.resolverObservers(true);
      delete frame.resolverObservers;
    }
  }
}

export function startStack(actions, startState, debug) {
  actions = normalizeIdObserversMissingErrors(actions); //todo moved up init time

  const frame = {actions, variables: startState, debug, sequence: '', afterSet}; //todo move afterSet to inside the response/observers check
  run(frame);
  let response = undefined;
  if ('response' in frame.variables) {
    response = frame.variables.response;
  } else if (actions.find(([id, p, f, out, error]) => out === 'response' || error === 'response')) {
    let resolverResponse;
    response = new Promise(r => resolverResponse = r);
    frame.resolverResponse = resolverResponse;
  }
  let observer = undefined;

  const unresolvedObservers = actions
    .filter(([id, p, f, out]) => out.startsWith("_observer_") && !(out in frame.variables))
    .map(([id, p, f, out]) => parseInt(out.split('_')[2]));
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