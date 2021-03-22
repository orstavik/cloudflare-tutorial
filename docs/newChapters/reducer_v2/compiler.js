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

//EMPTY reserved word, and adding the
const EMPTY = {};

const operators = {
  '!': {
    fun: function makeCache() {
      return {
        _cache: {},
        _function: function cache(value, ...keys) {
          const key = JSON.stringify(keys.length ? keys : keys[0]);
          if (value === EMPTY) {
            if (key in this._cache)
              return this._cache[key] = value;
            throw 'Expected Error, cache function is triggering alternative path.';
          }
          //todo add the reduction of the cache according to operator arguments...
          return this._cache[key] = value;
        }
      }._function
    },
    opName: 'bang',
    funName: 'cache'
  },
  '?': {
    fun: function makeGoldenMean() {
      return {
        _cache: {},
        _function: function goldenMean(value, ...keys) {
          const key = JSON.stringify(keys.length ? keys : keys[0]);
          if (value === EMPTY)
            throw 'Expected Error, goldenMean function is triggering alternative path.';
          if (typeof value !== 'number')
            throw 'goldenMean only tackle number values.';
          const nums = this._cache[key] || (this._cache[key] = []);
          nums.push(value);
          return nums.reduce((a, b) => (a + b)) / nums.length;
        }
      }._function
    },
    opName: 'goldenMean',
    funName: 'goldenMean'
  },
}

// [!...params], !fun, out, error
//
//   becomes
//
// [empty, "out", ...bangparams], cache, out, _notInCacheID.
// [...params, &_notInCacheID], fun, _putInCacheID, error.
// [_putInCacheID, "out", ...bangparams], cache, out, _errorPutInCacheID.
//
//bangparams = only arguments with bang in front, but with the bang removed
//params = all arguments with bang removed.
//_notInCacheID is `_notInCache${actionId}`
//_putInCacheID is `_putInCache${actionId}`
function convertCacheOperator([id, params, fun, output, error], OP, funName, opName) {
  fun = fun.substr(OP.length);
  const bangParams = params.filter(p => p.startsWith(OP)).map(p => p.substr(OP.length));
  params = params.map(p => p.substr(OP.length));                                         //replace only the operator from the params
  const _notInCacheID = `_notIn${opName + id}`;
  const _putInCacheID = `_putIn${opName + id}`;
  const _errorPutInCacheID = `_errorPutIn${id}`;
  return [
    [id + OP + 1, [EMPTY, `"${output}"`, ...bangParams], funName, output, _notInCacheID],
    [id + OP + 2, [...params, '&' + _notInCacheID], fun, _putInCacheID, error],
    [id + OP + 3, [_putInCacheID, `"${output}"`, ...bangParams], funName, output, _errorPutInCacheID]
  ];
}

// [something, bob, test1, test2, test3], fun, [case1, case2, case3], else
//
//   becomes
//
// [something, bob, test1], fun, case1, _else_ID_0
// [something, bob, test2, &_else_ID_0, &&case1], fun, case2, _else_ID_1
// [something, bob, test3, &_else_ID_1, &&case1, &&case2], fun, case3, else

// [something, test1, test2, test3], equals, [case1, case2, case3], else
//
//   becomes
//
// [something, test1], equals, case1, _else_ID_1
// [something, test2, &_else_ID_1, &&case1], equals, case2, _else_ID_2
// [something, test3, &_else_ID_2, &&case1, &&case2], equals, case3, else
//todo untested

function convertArrayOutput(action) {
  let [id, params, fun, output, error] = action;
  id = id + 'x';
  const otherArgs = params.slice(0, params.length - output.length);
  return output.map((caseI, i) => {
    const testI = params[otherArgs.length + i];
    const ps = [...otherArgs, testI];
    i && ps.push(`&_else_${id}_${i}`);
    for (let j = i; j > 0; j--)
      ps.push('&&' + output[j - 1]);
    const alternative = i + 1 === output.length ? error : `_else_${id}${i + 1}`;
    return [id + i, ps, fun, caseI, alternative];
  });
}

function compileCacheActions(actions, operators) {
  let res = [];
  //todo add the functions that we are using here.
  //we can do this for 'get' too.                      
  // let funs = [];
  main: for (let action of actions) {
    if (action[3] instanceof Array) {
      res = res.concat(convertArrayOutput(action))
      continue main;
    }
    for (let OP in operators) {
      const {funName, opName, fun} = operators[OP];
      if (!action[2].startsWith(OP))
        continue;
      // funs.push(fun);
      res = res.concat(convertCacheOperator(action, OP, funName, opName));
      continue main;
    }
    res.push(action);
  }
  return res;
  // return {functions: funs, actions: res};
}

export function compile(actions) {
  actions = compileCacheActions(actions, operators);
  actions = normalizeIdObserversMissingErrors(actions);
  actions.forEach(action => action[1] = action[1].map(p => parseParam(p)));
  return actions;
}

/**
 * BUILTIN FUNCTIONS
 */
// first:  a => a
// fail:   a => throw a
export const BUILTIN = {
  get: function get(obj, path) {
    if (!path)
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
  },
  equals: function equals(...args) {   //todo untested
    if (args.length === 1 ? !!args[0] : args[0] === args[1])
      return args[0];
    throw 'else';
  }
}