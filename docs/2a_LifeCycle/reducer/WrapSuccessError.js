//2. the asyncErrorRace with dependency support
const neverEnds = new Promise(r => r);

//removes *-prefix and turns all (pending) Promises into undefined
// (a normal object will be able to hold Promises, but a firstWinsObject will only hold pending Promises.)
function getArgsRightNow(state, args) {
  return args.map(arg => (arg = state[arg[0] === '*' ? arg.substr(1) : arg], arg instanceof Promise ? undefined : arg));
}

/**
 * @param state<Object> The object which contains the arguments
 * @param args<Array: string> the properties on the object which must be resolved,
 *        all args prefixed with "*" are skipped.
 * @returns {Promise|boolean}
 *          true if all the arguments are resolved,
 *          otherwise a Promise when all the arguments are resolved
 */
function argsReady(state, args) {
  const awaitArgs = args.filter(arg => arg[0] !== '*').map(arg => state[arg]).filter(arg => arg instanceof Promise);
  return awaitArgs.length ? Promise.allSettled(awaitArgs) : true;
}

function syncInvokefun(fun, state, args) {
  try {
    const argsRightNow = getArgsRightNow(state, args);
    const res = fun(...argsRightNow);
    if (!(res instanceof Promise))
      return {success: res, error: neverEnds};
    let resCb, errCb;
    const success = new Promise(r => resCb = r), error = new Promise(r => errCb = r);
    res.then(r => resCb(r), e => errCb(e));
    return {success, error};
  } catch (err) {
    return {success: neverEnds, error: err};
  }
}

function asyncInvokeFun(ready, fun, state, args) {
  let resCb, errCb;
  const success = new Promise(r => resCb = r), error = new Promise(r => errCb = r);
  ready.then(() => {
    try {
      const argsRightNow = getArgsRightNow(state, args);
      const res = fun(...argsRightNow);
      res instanceof Promise ? res.then(r => resCb(r), e => errCb(e)) : resCb(res);
    } catch (err) {
      errCb(err);
    }
  });
  return {success, error};
}

export function wrapSuccessError(fun, state, args) {
  const ready = argsReady(state, args);
  return ready === true ? syncInvokefun(fun, state, args) : asyncInvokeFun(ready, fun, state, args);
}