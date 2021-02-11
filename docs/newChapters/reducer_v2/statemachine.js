//returns either two Promises or either only success(not a Promise) or error (not a Promise)
function runFun(fun, args) {
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

function firstReadyAction(frame) {
  main:for (let i = 0; i < frame.remainingActions.length; i++) {
    let action = frame.remainingActions[i];
    const args = [];
    for (let p of action[1]) {
      if (!(p instanceof Object))
        args.push(p);
      else if (p.op === '*' || p.key in frame.state)
        p.op !== '&' && args.push(frame.state[p.key]);
      else
        continue main;
    }
    frame.remainingActions.splice(i, 1);
    return {action, args};
  }
  return {};
}

function asyncActionReturns(frame, callTxt, key, val) {
  if (key in frame.state)
    return frame.trace += callTxt + 'b';
  setValue(frame, callTxt, key, val);
  run(frame);
}

function setValue(frame, callTxt, key, val) {
  frame.trace += callTxt;
  frame.state[key] = val;
  frame.remainingActions = frame.remainingActions.filter(([id, params, _, output]) => {
    if (output === key || params.find(({op, key: p}) => op === '&&' && p === key)) {
      frame.trace += `:${id}_c`;
      return false;
    }
    return true;
  });
  //todo Loose end analysis. "Loose ends" are states that are defined by the user, but not used as input anywhere.
  // 'response' and _observer_s are such states, that will be run.
  // There should be a rule that says that loose ends will be cleaned up and removed whenever possible.
  // If you want to have a state that is to be left as a loose end, we need to give this a prefix.
  frame.postFrame && frame.postFrame.forEach(fun => fun(frame));
}

export function run(frame) {
  for (let {action, args} = firstReadyAction(frame); action; {action, args} = firstReadyAction(frame)) {
    const [id, params, fun, output, error] = action;
    frame.trace += `:${id}_i`; //adding invoked. This is just a temporary placeholder, in case the runFun crashes.. so we get a debug out.
    frame.preInvoke && frame.preInvoke.forEach(fun => fun(frame));
    const result = runFun(fun, args);
    if (result.success instanceof Promise) {
      frame.trace += 'a';
      result.success.then(val => asyncActionReturns(frame, `:${id}_o`, output, val));
      result.error.then(val => asyncActionReturns(frame, `:${id}_e`, error, val));
    } else if ('success' in result) {
      setValue(frame, 'o', output, result.success);
    } else /*if ('error' in result)*/ {
      setValue(frame, 'e', error, result.error);
    }
  }
}