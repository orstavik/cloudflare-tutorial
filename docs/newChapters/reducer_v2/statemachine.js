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
  main: for (let action of frame.actions) {
    const [id, params, fun, output] = action;
    if (frame.sequence.indexOf(`:${id}_`) >= 0) continue;          //action already invoked, this can be done at the start

    if (output in frame.variables) {               //goal completed, cancelling action
      frame.sequence += `:${id}_c`;            // todo this and _waiting can be discovered from analysis of the actions and callSequence..
      continue;
    }
    const args = [];
    for (let pp of params) {
      if (!(pp instanceof Object)) {
        args.push(pp);
      } else if (pp.op === '&&') {
        if (pp.key in frame.variables) {
          frame.sequence += `:${id}_c`;         //todo
          continue main;                        //the && inverse required parameter has already been set, so this action can be cancelled
        }
      } else if (pp.op === '&') {
        if (!(pp.key in frame.variables)) {
          // frame.sequence += `:${id}_w`; // todo illustrates when a function could have been called, but whose arguments was not ready.
          continue main;
        }         //we continue, but we don't add the parameter to the args list
      } else if (pp.op !== '*' && !(pp.key in frame.variables)) {
        // frame.sequence += `:${id}_w`; // todo illustrates when a function could have been called, but whose arguments was not ready. Must change the test against the callSequence to see if the action has already been called.
        continue main;
      } else {
        args.push(frame.variables[pp.key]);
      }
    }
    return {action, args};                                    //else, action is ready
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

export function run(frame) {
  for (let {action, args} = firstReadyAction(frame); action; {action, args} = firstReadyAction(frame)) {
    const [id, params, fun, output, error] = action;
    frame.sequence += `:${id}_i`; //adding invoked. This is just a temporary placeholder, in case the runFun crashes.. so we get a debug out.
    frame.preInvoke?.call(frame);
    const result = runFun(fun, args);
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