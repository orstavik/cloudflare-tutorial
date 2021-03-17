# HowTo: memoize cloneables?

In this chapter we discuss memoizing functions that return clonable outputs.

## Demo: a generic `memoizeClone()` (no `Error` retention)

We start this discussion by presenting a generic memoize function that handle cloneable outputs. This function do not memoize `Error`s thrown.

```javascript
function memoizeClone(original, size = 100) {
  const cache = {};
  return function regulator(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      const value = cache[key];
      delete cache[key];
      cache[key] = value;
      return value instanceof Promise ?
        value.then(clonable => clonable.clone()) :
        value.clone();
    }
    const res = original(...args);
    const keys = Object.keys(cache);
    keys.length >= size && delete cache[keys[0]];
    cache[key] = res;
    if (res instanceof Promise) {
      res.then(res2 => cache[key] = res2);
      res.catch(error => delete cache[key]);
      return res.then(clonable => clonable.clone());
    }
    return res.clone();
  }
}
```

## Problem 1: `DOMNodes`

To make a set of `DOMNode`s is a good example of a heavy sync process that is a) most often possible to memoize if you b) always `cloneNode(true)` the result. Here is a demo of such a `memoize` regulator. This demo assumes:

1. that the original function is always sync, and
2. that the original function never fails/`throws`.

```javascript
function memoizeDOMNodes(original, size = 100) {
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

function txtToDOM(txt) {
  const t = document.createElement('template');
  t.innerHTML = txt.trim();
  return t.content.firstChild;
}

txtToDOM = memoizeDOMNodes(txtToDOM);

const a = txtToDOM('<h1>hello sunshine</h1>');
const b = txtToDOM('<h1>hello world</h1>');
const c = txtToDOM('<h1>hello sunshine</h1>');
console.log(a !== c); //true
```

Att!! This is not an alternative to a stronger template engine such as uhtml and similar.

## Problem 2: `memoize(fetch)` and `Response.clone()`

When we memoize `fetch()`, we must make several choices:

1. Some parts of your app might use `fetch()` to get data from fluid sources such as a json file representing the latest chat messages in a chatroom. Other parts of your app might use `fetch()` to get static resources such as `.html`, `.css`, and `.js` files. Therefore, you likely want to memoize only some call instances to `fetch()`, not all.
2. The `fetch()` returns a `Response` object. But. We cannot reuse the `Response` object directly. Each `Response` object can only be used once, and therefore we must *always* `.clone()` the `Response` before we use them (even the first time).
3. `fetch()` depends on a network connection. Networks are not stable: a `fetch()` call may throw an `Error` right now, and then very well succeed in a minute or a ms. Thus, we most often do not want to memoize `fetch()` thrown errors.
4. `HTTP` has its own syntax of errors: `404`, `500`, etc. Do we wish to *cache* such results? Or do we wish to avoid memoizing failing results?

Thus. When we `memoize(fetch)`, we therefore commonly choose *not* memoize `Error`s. This gives us a simple in/out criteria, that we can use to handle error `status` codes too. However, we do not need to filter `status` codes inside the regulator, we can do this in a plain old javascript function like this:

```javascript
async function myFetch(url, options) {
  const response = await fetch(url, options);
  if (response.status === 404)
    throw new Error('404: FileNotFound');   //We intend not to memoize 404
  return response;
}

const memoMyFetch = memoize(myFetch);
```       

Similarly, if we wish to memoize only a *select few types* of `Error`s thrown, we can also do this outside the regulator in a similar plain old javascript function.

```javascript
async function myFetch2(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    return new Response('FileNotFound', {status: 404}); //we intend to memoize certain errors
  }
}
```

## Test: one

```javascript
function memoizeLRU(original, size = 100) {
  const cache = {};
  return function regulator(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      const value = cache[key];
      delete cache[key];
      return cache[key] = value;
    }
    const keys = Object.keys(cache);
    keys.length >= size && delete cache[keys[0]];
    const res = original(...args);
    return cache[key] = res;
  }
}

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

The result will be:

```
true
false
false {hello: "sunshine"} {hello: "sunshine"} true
false <div>​</div>​ <div>​</div>​ false
```

## Test: 2 asyncMemoize

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

The output will be:

```
Promise {<pending>} Promise {<pending>} true
{hello: "sunshine"} {hello: "sunshine"} true
{hello: "sunshine"} true
{hello: "sunshine"} true
```

## References

* [Memoize JavaScript Promises for Performance](https://medium.com/globant/memoize-javascript-promises-for-performance-1c77117fb6b8)
