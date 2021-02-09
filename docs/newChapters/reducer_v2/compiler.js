// todo
// 1. syntax check for dead end states. We do this by checking each action. If the action is missing a required state (ie. a required state is neither an output of any other action, or a start variable), then we remove this action. We repeat this function recursively until there are no such actions removed in an entire pass). This will remove any loose ends. This can be done at compile time.
//2. if this removes response, or any observers, then this will of course clear the way for any errors.


// Parse parameters into either primitive arguments or <op><state> objects.
function normalizeIdObserversMissingErrors(actions) {
  return actions.map((a, i) => (a = [i, ...a], (a.length === 3 && a.push(`_observer_${i}`)), (a.length === 4 && a.push(`_error_${i}`)), a));
}

function parseParam(p) {
  //primitives
  if (p === '') return undefined;//todo what should we do here?
  if (p[0] === '"') return p.substr(1, p.length - 2);
  if (p[0] === "'") return p.substr(1, p.length - 2);
  if (p === "null") return null;
  if (p === "undefined") return undefined;
  if (p === 'false') return false;
  if (p === 'true') return true;
  const num = parseFloat(p);
  if (num === p) return num;

  //<operator [*!&]{0,2}><state [a-z][a-zA-Z]*>
  const [match, op, key] = p.match(/([*!&]{0,2})([a-z][a-zA-Z]*)/) || [];
  if (match)
    return {op, key};
  throw new SyntaxError('Illegal parameter: ' + p);
}

let cache = {};

function fromCacheFun(...keys) {
  const key = JSON.stringify(keys.length === 1 ? keys[0] : keys);
  if (!(key in cache))
    throw new Error();
  return cache[key];
}

function toCacheFun(val, ...keys) {
  const key = JSON.stringify(keys.length === 1 ? keys[0] : keys);
  cache[key] = val;
}

function a2a(a) {
  return a;
}

export function setCache(obj){
  cache = obj;
}

//!...args, fun,!out, error
//["out", ...args], fromCacheFun, out, _errorNoCache.
// [...args, &_errorNoCache], fun, _toCache, error.
// [&&out, "out", _toCache, !...args], toCacheFun.
// _toCache, firstArgIsOutputFun, out.

// First argument "out" is a string parameter with the name of the cache registry. Then non-! args are removed from the args list, and then the ! is removed from the argument name.
// The full ...args list is added to the action, and the ! is removed from the argument names. An additional &_errorNoCache argument is added. The action is forced to wait for this argument, but it will not be included in the invocation.


// caching observer. The first &&out parameter ensures that the action is cancelled as soon as the state out is set by somebody else. The &&out parameter is not included in the invocation. "out" is the string name for the cache registry. _toCache is the output of the fun that we want to cache. Then non-! args are removed from the args list, and then the ! is removed from the argument name.

function convertCacheOperator([id, params, fun, output, error], get, put, operator, fun3) {
  output = output.substr(operator.length);
  const bangParams = params.filter(p => p.op === operator);
  const newId = id + operator;
  return [
    [newId + 1, [`"${output}"`, ...bangParams], get, output, `_notFound${id}`],
    [newId + 2, [...params, {op: '&', key: '_notFound' + id}], fun, `_toCache${id}`, error],
    [newId + 3, [{op: '&&', key: output}, {op: '', key: '_toCache' + id}, `"${output}"`, ...bangParams],
      put, `_observer_${newId}3`, `_error_${put.name}_${newId}3`],
    [newId + 4, [{op: '', key: '_toCache' + id}], fun3, output, '_error_' + id + operator + 4]
  ];
}

function compileCacheActions(actions) {
  let res = [];
  for (let action of actions) {
    if (action[3][0] === '!')
      res = res.concat(convertCacheOperator(action, fromCacheFun, toCacheFun, '!',  a2a));
    else
      res.push(action);
  }
  return res;
}

export function compile(actions){
  actions = normalizeIdObserversMissingErrors(actions); //todo moved up init time
  actions.forEach(action => action[1] = action[1].map(p => parseParam(p)));
  return compileCacheActions(actions);
}

/**
 * BUILTIN FUNCTIONS
 */
// doNothing:  a=>a
// fail:       a=>throw a
export function get(obj, path) {
  if (path === '')
    return obj;
  if (!(obj instanceof Object))
    throw new SyntaxError('The action "get" is given an illegal object: ' + typeof obj);
  if (typeof path !== 'string')
    throw new SyntaxError('The action "get" is given an illegal path: ' + typeof path);
  for (let segment of path.split('.')) {
    if (obj instanceof Headers || obj instanceof URLSearchParams)
      obj = obj[segment] || obj.get(segment);
    else
      obj = obj[segment];
  }
  return obj;
}