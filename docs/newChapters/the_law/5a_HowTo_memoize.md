# HowTo: memoize?

Memoize is the act of caching the output for a particular function given the same set of inputs. It is a good first regulator to learn. Below is a basic memoization function:

```javascript
function memoize(original) {
  const cache = {};
  return function regulator(...args) {
    const key = JSON.stringify(args);
    if (cache[key])
      return cache[key];
    return cache[key] = original(...args);
  }
}
```

## Why: memoize?

1. `fetch`. Use memoize to create your own network cache. This might be better for certain types of apps, but at the same time, investigate how your server/browser already caches network requests, as you will now have many many caches which can give you great pain.

2. Heavy `async` functions that recur against the same input values again and again, such as `decrypt`.

3. Heavy `sync` functions, such as heavy mathematics, text processing, DOM node creation.

## Which: functions can we memoize?

You should only memoize pure functions:

1. Pure functions get pure values as input. If you memoize a function whose input values are impure, ie. they contain state information that cannot be serialized/signatured consistently, then your memoized regulated functions might think that:
	* two functions that are given different input arguments are
	* two functions that are given identical input arguments.

2. Pure functions produce pure (or at least cloneable) values. If your original function produces an impure output such as a `Stream` object, then these impure objects cannot be reused (without first being cloned or similar).

3. Pure functions have no side effects. If your original function has side-effects, and then the memoize regulator causes some invocations to this function to be skipped, then you have a problem. If the original function has side-effects, you must evaluate if you can skip those side-effects before you memoize it.

## Why: `JSON.stringify(..)`?

Note: The regulator in the `memoize` function above creates a argument signature key using `JSON.stringify(args)`. `JSON.stringify(args)` is the recommended approach because:

1. `JSON.stringify(args)` is generic in terms of argument type and count,
2. `JSON.stringify(args)` is very simple, and
3. `JSON.stringify(args)` is relatively fast.

However, be aware that JSON doesn't distinguish between `undefined` and `null` and unset properties:
`JSON.stringify({a: [, undefined], b: undefined}) === JSON.stringify({a: [null, null]})`.

## HowTo: memoizeLRU?

LRU is short for Least Recently Used (or Last Recently Used, whichever you prefer). LRU is a simple mechanism to avoid saving everything forever, and using too much memory. In fact, if you intend for your application to run for a little while, and expect a function to be called with different arguments, then you probably should make your memoize function with an LRU strategy.

```javascript
function memoizeLRU(original, size = 100) {
  const cache = {};
  return function regulator(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      const value = cache[key];    //we delete the key (entry)
      delete cache[key];           //and then we put the key (entry) back in  
      return cache[key] = value;   //this changes the order of the key in the object.  
    }
    const keys = Object.keys(cache); //the last used keys are at the end of Object.keys()
    keys.length >= size && delete cache[keys[0]]; //thus, keys[0] is the least recently used
    const res = original(...args);
    return cache[key] = res;
  }
}

const memoAbs = memoizeLRU(Math.abs); //
const two = memoAbs(-2);
const twotwo = memoAbs(-2);
```

//todo move async lru without error handling.

```javascript
function memoizeLRUasync(original, size = 100) {
  const cache = {};
  const regulator = function (...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      const value = cache[key];
      delete cache[key];//by deleting the key, we change the key order when we put it back in. LRU. Presto! 
      return cache[key] = value;
    }
    const keys = Object.keys(cache);
    keys.length >= size && delete cache[keys[0]];
    const res = original(...args);
    if (!(res instanceof Promise))
      return cache[key] = res;
    res.catch(err => delete cache[key]);
    return cache[key] = res.then(res2 => cache[key] = res2);
  }
  Object.defineProperty(original, 'name', {value: '_mem_' + original.name});
  return regulator;
}

const memoAbs = memoizeLRUasync(Math.abs); //
const two = memoAbs(-2);
const twotwo = memoAbs(-2);
```

## WhatAbout: `Error`s?

> Should we `memoize` our original's mistakes? Or should we just move on?

When we memoize `Error`s we must create two separate cache tables in order to simply distinguish between cached outputs that should be `return`ed and cached errors that should be `throw`n:

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
```

> If you don't want to memoize `Error`s, then simply use the basic approach. In the basic example at the beginning of the article, then if the original function fails and throws an `Error`, then the basic memoization function above will not `cache` anything: the error `throw`n will cancel the post-processing in the regulator. But. Is that a bad thing? Or a good thing? Do we want to cache previous `Error`s so to avoid calling functions to reproduce them? Or do we want to forget previous `Error`s and hope that it will just work next time?
>
> The answer is: it depends. Most of all it depends on the original function and your use of that original function. Secondly, it depends on the `Error`, its type and instance and context. For some original functions and some `Error`s you might like to try several times, for other original functions, you might like to avoid making the same mistake twice, needlessly.

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