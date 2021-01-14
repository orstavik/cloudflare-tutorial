# WhatIs: `Promise.race`?

## `Promise.race([..])` can be nested

You can test this out in devtools, and it returns 3.

```javascript
await Promise.race([
  new Promise(r=>setTimeout(()=>r(1),9)),
  Promise.race([
    new Promise(r=>setTimeout(()=>r(2),5)),
    new Promise(r=>setTimeout(()=>r(3),1))
  ])
]);
//returns 3
```

## Append an extra promise to an ongoing `Promise.race(..)`?

`Promise.race(...)` works nicely. But if you need to *add* more promises to an already ongoing race, you need something more.

## normal `Promise.race(..)`

```javascript
const one9 = new Promise(r => setTimeout(() => r('one'), 9));
const two7 = new Promise(r => setTimeout(() => r('two'), 7));
const three5 = new Promise(r => setTimeout(() => r('three'), 5));
const four2 = new Promise(r => setTimeout(() => r('four'), 2));

const a = Promise.race([one9, two7]);
const b = Promise.race([a, three5]);
const c = Promise.race([b, four2]);
console.log(a === b); //false
console.log(b === c); //false

(async function () {
  console.log(await a)
})();
(async function () {
  console.log(await b)
})();
(async function () {
  console.log(await c)
})();
```

## custom `PromiseRace(..)`

```javascript
function recResolve(val, success) {
  val instanceof Promise ? val.then(v => recResolve(v, success)) : success(val);
}

const activeRaces = new WeakMap();

//if one of the promises coming in (the first one found),
//is a promise that is derived from a previous PromiseRace,
//then the new Promises are appended to that race, instead of adding to a new one.
function PromiseRace(promises) {
  for (let p of promises)
    if (!(p instanceof Promise))
      return p;

  let successPromise, success;
  successPromise = promises.find(promise => success = activeRaces.get(promise));
  if (!success) {
    successPromise = new Promise(r => success = r);
    activeRaces.set(successPromise, success);
  }

  for (let p of promises)
    p !== successPromise && p.then(value => recResolve(value, success));
  return successPromise;
}

const one9 = new Promise(r => setTimeout(() => r('one'), 9));
const two7 = new Promise(r => setTimeout(() => r('two'), 7));
const three5 = new Promise(r => setTimeout(() => r('three'), 5));
const four2 = new Promise(r => setTimeout(() => r('four'), 2));

const _a = PromiseRace([one9, two7]);
const _b = PromiseRace([_a, three5]);
const _c = PromiseRace([_b, four2]);

console.log(_a === _b);
console.log(_b === _c);

(async function () {
  console.log(await _a)
})();
```

## References