# HowTo: memoize?

Memoize is the act of caching the output for a particular set of inputs for a function. It is one of the primary targets for higher-order functions, and the first higher-order function you should learn.

## Memoize use cases

1. `fetch`. Use memoize to create your own network cache. This might be better for certain types of apps, but at the same time, investigate how your server/browser already caches network requests, as you will now have many many caches which can give you great pain.

2. Heavy `async` functions that recur against the same input values again and again, such as `decrypt`.

3. Heavy `sync` functions, such as heavy mathematics, text processing, DOM node creation.

You should only memoize pure functions, functions that:

1. only get pure values as input,
2. only produce pure or cloneable values, and
3. have no side effects.

If your input values are not pure, ie. they contain state information that cannot be serialized/signatured consistently, then your memoized regulated functions might think that:

* two functions that are given different input arguments are
* two functions that are given identical input arguments.

If your function has side-effects, such as making a network request or updating a system counter, then every invocation of the original function can trigger those side effects. Thus, when your memoized regulated function call makes a hit in its cache, then it will skip those side-effects. This is often good, but an active decision must be made whether this is desired in each instance.

If your original function produces a impure output such as a `Response` or `Stream` object, then these impure objects cannot be reused. Such original functions can never be memoized.

## Step1: Basic memoization

The basic memoization function looks like this:

```javascript
function memoize(original) {
  const cache = {};
  return function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache[key])
      return cache[key];
    return cache[key] = original(...args);
  }
}
```

### Why: `JSON.stringify(..)`?

Note that the function used to create a signature key for the arguments is `JSON.stringify(args)`. `JSON.stringify(..)` is the recommended approach because it is a) generic in terms of argument type and count, b) very simple, and c) fast. But, be aware that JSON doesn't distinguish between `undefined` and `null` and unset properties:

```javascript
console.log(JSON.stringify({a: [, undefined], b: undefined}));
console.log(JSON.stringify({a: [null, null]}));
```

## Step2: to remember ones mistakes, or to move on? That is the question.

If the original function fails and throws an `Error`, then the basic memoization function above will not work.

So, the question is: do we want to remember previous `Error`s and cache them? Or do we hope that the `Error` is temporary and that the function *might* succeed next time we ask it?

Often, `Error`s might right themselves. For example, the `Error` might be caused by a faulty network connection, and as soon as the internet connection is re-established, the function will work. A function that gets data from the network, disc, system or whatever, might very well be considered pure enough for memoization. If that is the case, you do not wish to cache `Error`s, and the basic implementation is good enough (for sync functions).

But, if you know that the memoized function have no such context, then you might wish to cache any `Error`s. If so, here is how you do that:

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
      debugger
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

## HowTo: memoizeLRU?

LRU is short for Least Recently Used. It is a simple mechanism to avoid saving everything forever, and using too much memory. In fact, if you intend for your application to run for a little while, and expect a function to be called with different arguments, then you must use an LRU strategy.

```javascript
function memoizeLRU(original, size = 100) {
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

const memoAbs = memoizeLRU(Math.abs); //
const two = memoAbs(-2);
const twotwo = memoAbs(-2);
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

## References

* 