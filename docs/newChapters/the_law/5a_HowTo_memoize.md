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

2. Pure functions produce pure (or at least cloneable) values. If your original function produces an impure output such as a `Stream` object, then these impure objects cannot be reused (without first being cloned or similar). (more about memoizing cloneables in the next chapter).

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

## WhatAbout: `async` memoize?

If you pass an async original function to your memoize function, it will return a `Promise`. We can memoize these `Promises`. But. With a few hickups:

1. What about `Error` thrown?
2. Shouldn't we update the `cache` once the `Promise` resolves?
3. What if this function is applied to sync functions? Do we have to turn the result of the async regulator into a `Promise`?
3. And how do we mix this all up with an LRU cache?

Below is a demo that does this. It will manage async functions, with potential `Error`s, and update the cache register with the settled value once cleared. If the `Promise` fails belatedly, then the `Promise` and key in the cache is cleared. All with LRU enabled.

```javascript
function memoize(original, size = 100) {
  const cache = {};
  const errors = {};
  return function regulator(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      const value = cache[key];
      delete cache[key];
      return cache[key] = value;
    }
    if (key in errors) {
      const value = errors[key];
      delete errors[key];
      throw errors[key] = value;
    }
    try {
      const res = original(...args);
      const keys = Object.keys(cache);
      keys.length >= size && delete cache[keys[0]];
      cache[key] = res;
      if (res instanceof Promise) {
        res.then(res2 => cache[key] = res2);
        res.catch(error => {
          delete cache[key];
          const keys = Object.keys(errors);
          keys.length >= size && delete errors[keys[0]];
          errors[key] = res2;
        });
      }
      return res;
    } catch (err) {
      const keys = Object.keys(errors);
      keys.length >= size && delete errors[keys[0]];
      throw errors[key] = res2;
    }
  }
}

const memoAbs = memoize(Math.abs);
const two = memoAbs(-2);
const twotwo = memoAbs(-2);
```

## References

* 