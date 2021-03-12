# HowTo: memoize cloneables?

## Demo: Cloneable 1: `DOMNodes`

To make a set of `DOMNode`s is a good example of a heavy sync process that is a) most often possible to memoize if you b) always `cloneNode(true)` the result. Here is a demo of such a `memoize` regulator that assumes a sync original function that will not fail/`throw` anything.

```javascript
function memoizeDOMNodes(original) {
  const cache = {};
  return function regulator(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      const value = cache[key];
      delete cache[key];
      cache[key] = value;
      return value.cloneNode(true);
    }
    const keys = Object.keys(cache);
    keys.length >= size && delete cache[keys[0]];
    return cache[key] = original(...args);
  }
}

function makeH1(text) {
  const h1 = document.createElement('h1');
  h1.innerText = text;
  return h1;
}

makeH1 = memoizeDOMNodes(makeH1);

const a = makeH1('hello sunshine');
const b = makeH1('hello world');
const c = makeH1('hello sunshine');
console.log(a !== c);
```

## Demo: Cloneable 2: `async` `Response`, with no `Error`

The `fetch()` is another prime candidate for memoization.

```javascript
function memoizeResponse(original) {
  const cache = {};
  return function regulator(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      const value = cache[key];
      delete cache[key];
      cache[key] = value;
      if (value instanceof Promise)
        return value.then(response => response.clone());
      return value.clone();
    }
    const keys = Object.keys(cache);
    keys.length >= size && delete cache[keys[0]];
    const promise = original(...args);
    cache[key] = promise;
    promise.then(response => cache[key] = response);
    promise.then(response => delete cache[key]);
    return promise.then(response => response.clone());
  }
}

const memoFetch = memoizeDOMNodes(fetch);

(async function () {

  let a = memoFetch('https://example.com/a');
  if (a instanceof Promise){
    console.log("a is a ", a.constructor.name);
    a = await a;
    console.log("a is now a ", a.constructor.name);
  }
  const b = memoFetch('https://example.com/a');
  console.log("b is a ", a.constructor.name);
  console.log(a !== b);
})();
```

How you can memoize two impure, but cloneable outputs: `DOMNode` and `Response` objects. Making `DOMNode`s is a good example of a heavy sync ; `fetch()` is a good example of a heavy async function that returns a `Response` object that must be `clone()`d before (re)use.

The demo below holds three different memoize functions:

1. `memoizeDOMNodes`. This assumes a sync function, and will memoize/cache `Error`s.
2. `asyncMemoizeFetch`. This is the simple `async` variant, with no `Error` management.
3. `memoizeFetch`. This variant updates the cache to contain the `Response` object once the initial `Response` has settled.

```javascript
function memoizeLRU(fun, size = 100) {

  function toCloneOrNot(output) {
    return output instanceof Object && output.clone instanceof Function ? output.clone() :
      output instanceof Object && output.cloneNode instanceof Function ? output.cloneNode(true) : output;
  }

  const cache = {};
  const fun2 = function (...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      const value = cache[key];
      delete cache[key];
      cache[key] = value;
      return value instanceof Promise ? value.then(res2 => toCloneOrNot(res2)) : toCloneOrNot(value);
    }
    const keys = Object.keys(cache);
    keys.length >= size && delete cache[keys[0]];
    const res = original(...args);
    if (!(res instanceof Promise))
      return toCloneOrNot(cache[key] = res);
    cache[key] = res; //adding the promise for now.
    res.catch(err => delete cache[key]);
    return res.then(res2 => toCloneOrNot(cache[key] = res2));
  }
  Object.defineProperty(fun, 'name', {value: '_mem_' + fun.name});
  return fun2;
}
```

### Test: neverForget!

```javascript
function memoize(original) {
  const cache = {};
  const error = {};
  return function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache[key])
      return cache[key];
    if (error[key])
      throw error[key];
    try {
      const res = original(...args);
      return cache[key] = res;
    } catch (err) {
      throw error[key] = err;
    }
  }
}

function get(obj, key) {
  return obj[key];
}

const efficientGet = memoize(get);

try {
  efficientGet(null, 'hello');
} catch (err) {
  err.test = 0;
  console.log(err.test++); //0
  console.log(err.message);//Cannot read property 'hello' of null
}

try {
  efficientGet(null, 'hello');
} catch (err) {
  console.log(err.test++); //1, because it is the same Error object that is reused.
  console.log(err.message);//Cannot read property 'hello' of null
}
```

## Step3: asyncMemoize

In the post-corona world of Javascript programming, no function is worth writing if one is not also willing to wait for its return.

```javascript
function asyncMemoize(original) {
  const cache = {};
  return function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache[key])
      return cache[key];
    const res = original(...args);
    if (res instanceof Promise) {
      res.then(res2 => cache[key] = res2);
      res.catch(err => delete cache[key]);
    }
    return cache[key] = res;
  }
}
```

## HowTo: memoizeLRU and support cloneable?

Often, the function you wish to memoize returns an impure, but cloneable value: `fetch` returns a `Response` object, or you may have a heavy custom function that returns a DOM node. You cannot simply reuse the previous object in this instance, but you can reuse a `clone()` of that object.

If you know that you will only memoize `Response` objects for example, then you can do this:

```javascript
function memoizeLRU(fun, size = 100) {

  const cache = {};
  const fun2 = function (...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      const value = cache[key];
      delete cache[key];
      cache[key] = value;
      return value instanceof Promise ? value.then(res2 => res2.clone()) : value.clone();
    }
    const keys = Object.keys(cache);
    keys.length >= size && delete cache[keys[0]];
    const res = original(...args);
    if (!(res instanceof Promise))
      return cache[key] = res, res.clone();
    cache[key] = res; //adding the promise for now.
    res.catch(err => delete cache[key]);
    return res.then(res2 => (cache[key] = res2, res2.clone()));
  }
  Object.defineProperty(fun, 'name', {value: '_mem_' + fun.name});
  return fun2;
}
```

Here is the memoize function that works for both pure outputs, `Reponse` objects, and DOM `Node`s.

```javascript
function memoizeLRU(fun, size = 100) {

  function toCloneOrNot(output) {
    return output instanceof Object && output.clone instanceof Function ? output.clone() :
      output instanceof Object && output.cloneNode instanceof Function ? output.cloneNode(true) : output;
  }

  const cache = {};
  const fun2 = function (...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      const value = cache[key];
      delete cache[key];
      cache[key] = value;
      return value instanceof Promise ? value.then(res2 => toCloneOrNot(res2)) : toCloneOrNot(value);
    }
    const keys = Object.keys(cache);
    keys.length >= size && delete cache[keys[0]];
    const res = original(...args);
    if (!(res instanceof Promise))
      return toCloneOrNot(cache[key] = res);
    cache[key] = res; //adding the promise for now.
    res.catch(err => delete cache[key]);
    return res.then(res2 => toCloneOrNot(cache[key] = res2));
  }
  Object.defineProperty(fun, 'name', {value: '_mem_' + fun.name});
  return fun2;
}
```

test:

```javascript
  function createDOM() {
  return document.createElement('div');
}

function sum(key, value) {
  const res = {};
  res[key] = value;
  return res;
}

async function asyncCreateDOM() {
  await new Promise(r => setTimeout(r, 10));
  return document.createElement('div');
}

async function asyncSum(key, value) {
  await new Promise(r => setTimeout(r, 10));
  const res = {};
  res[key] = value;
  return res;
}

const createDOM2 = memoizeLRU(createDOM);
const asyncCreateDOM2 = memoizeLRU(asyncCreateDOM);
const sum2 = memoizeLRU(sum);
const asyncSum2 = memoizeLRU(asyncSum);

(async function () {
  const a = sum2('hello', 'sunshine');
  const b = sum2('hello', 'sunshine');
  console.log(a === b);
  const c = createDOM2();
  const d = createDOM2();
  console.log(c !== d);
  const A = asyncSum2('hello', 'sunshine');
  const B = asyncSum2('hello', 'sunshine');
  console.log(A !== B, await A, await B, await A === await B);
  const C = asyncCreateDOM2();
  const D = asyncCreateDOM2();
  console.log(C !== D, await C, await D, await C !== await D);
})();
```

## Test: asyncMemoize //todo add test for lru

```javascript
function asyncMemoize(original) {
  const cache = {};
  return function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache[key])
      return cache[key];
    const res = original(...args);
    if (res instanceof Promise) {
      res.then(res2 => cache[key] = res2);
      res.catch(err => delete cache[key]);
    }
    return cache[key] = res;
  }
}

async function makeObject(key, value) {
  await new Promise(r => setTimeout(r, 20)); //sleep for 20ms
  const res = {};
  res[key] = value;
  return res;
}

const efficientMakeObject = asyncMemoize(makeObject);

(async function () {
  const a = efficientMakeObject('hello', 'sunshine');
  const b = efficientMakeObject('hello', 'sunshine');
  console.log(a, b, a === b);     //it is the same promise
  const a2 = await a;
  const b2 = await b;
  console.log(a2, b2, a2 === b2); //it is the same object, obviously
  const c2 = await efficientMakeObject('hello', 'sunshine');
  console.log(c2, c2 === a2);     //the object is cached
  const d2 = efficientMakeObject('hello', 'sunshine');
  console.log(d2, d2 === a2);     //we even get the cached object immediately, if we want to skip await
})();
```

Att! Often, the heavy functions return objects that must be `clone()` before use.

## HowTo: `memoize(fetch)`?

1. Not memoize network errors or missing files or something else, as this might be temporary and controlled outside the parameters.
2. Differentiate between sources that are static and sources that are fluid. Avoid fetching static files with the same function as the fluid file, and avoid keeping the static and fluid responses under the same variable/state property in your application.

What to do when you have a function that errors, but in a way that presents itself as a valid result? Ie. what do you do if you don't want to memoize the `404` results from a `fetch` call, but instead consider them an error on the part of the system??

We need a chapter about custom error format for functions. That is something that should be just wrapped around the original function, and then if it matches a criteria, then it throws an Error.

```javascript
async function fetchAndErrorOutside200(url, options) {
  const response = await fetch(url, options);
  if (response.status >= 200 && response.status < 300)
    throw new Error(response.status); //todo here we could have a custom Error type that would hold the Response object
  return response;
}

const memFetch = memoizeNotErrors(fetchAndErrorOutside200);  
```

## References

* 