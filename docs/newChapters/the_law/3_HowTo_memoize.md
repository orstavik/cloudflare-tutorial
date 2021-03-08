# HowTo: memoize?

Memoize is the act of caching the output for a particular set of inputs for a function. It is one of the primary targets for higher-order functions, and the first higher-order function you should learn.

You should only memoize pure functions, functions that:

1. only get pure values as input,
2. only produce pure values, and
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

## Test: asyncMemoize

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

## References

* 