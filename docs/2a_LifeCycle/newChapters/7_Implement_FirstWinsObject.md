# Implementation: `FirstComeWins`

A `Promise` is a one way street: once resolved, its fulfilled value is set forever. `FirstComeWins` is a dictionary that works similarly to a `Promise`: once a property has been set with a resolved value, then that property is fixed/frozen. Properties of `FirstComeWins`s cannot be altered/overwritten/reset once that value is resolved.

If you request a property from a `FirstComeWins` *before* that value is set, you will be given a temporary `Promise` that will resolve with the value of that property once it is set. If you request a property from a `FirstComeWins` *after* that value is set, you will always get that value.

### `get`

The getter works as follows. If the requested property is set, then simply return that property. If a request is made for a property not yet set, then instead return a new temporary `Promise` for that property, store the `resolver` method for that `Promise` so you can alert holders with the temporary `Promise` when the value is updates.

### `set`

The setter is slightly more complicated:

1. If the prop is already set and resolved, then do nothing. The rule is that a resolved property cannot be overwritten.

At this point, the property in the `FirstComeWins` is either unset or the temporary `Promise`.

2. If the new value is a `Promise`, simply try again when the new value resolves.

3. If the property in the `FirstComeWins` is unset and the new value is resolved, simply set it.

At this point, the property in the `FirstComeWins` must be a `Promise` and the value being must be resolved.

4. Get the temporary `Promise`. Update the value of the `FirstComeWins`. Then finally alert the holders of the temporary `Promise` about the new value of the property. todo check if i need to update the resolve first or not. It is important that the `FirstComeWins` is updated first, so as to avoid valling

## Implementation

```javascript
export const FirstComeWins = {
  p_r: new WeakMap(),
  get: function (target, prop, receiver) {
    if (prop in target)
      return Reflect.get(...arguments);
    let resolver;
    const promise = new Promise(r => resolver = r);
    Reflect.set(target, prop, promise);
    this.p_r.set(promise, resolver);
    return promise;
  },
  set: function (target, prop, value) {
    //1. the prop is already set and resolved? do nothing
    if (prop in target && !(target[prop] instanceof Promise))
      return true;

    if (value instanceof Promise)
      return value.then(newVal => this.set(target, prop, newVal)) && true; //target[prop] = newVal behaves like Reflect.get.

    if (!(prop in target))
      return Reflect.set(target, prop, value);

    const resolver = this.p_r.get(target[prop]);
    Reflect.set(target, prop, value);
    resolver(target[prop]);
    return true;
  }
};
```

## Tests

1. A non-`Promise` value can only be set once per property. If a property is already set to a value other than a `Promise`, then that property can never change.

```javascript
const race = new Proxy({}, FirstComeWins);
race.a = 'a';
race.b = undefined;
race.a = 'b';
race.b = 'b2';
console.log(1, race.a === 'a', race.b === undefined);
```

2. Test temporary `Promise`.

```javascript
async function testAsync(ms, value) {
  await new Promise(r => setTimeout(r, ms));
  return value;
}

const race = new Proxy({}, FirstComeWins);
const temp1 = race.a;
console.log(2, temp1 instanceof Promise);
race.a = 'a';
console.log(2, race.a === 'a', temp1 instanceof Promise);
```

```javascript
async function testAsync(ms, value) {
  await new Promise(r => setTimeout(r, ms));
  return value;
}

const race = new Proxy({}, FirstComeWins);
const temp1 = race.a;
const promise = testAsync(10, 'async');
race.a = promise;
console.log(2, temp1 === race.a, promise !== race.a);
console.log(2, await promise === await temp1);
```

3. If a property value is set to a `Promise`, then when that `Promise` is resolved, the property value of the `FirstComeWins` object will automatically be updated.

```javascript
async function testAsync(ms, value) {
  await new Promise(r => setTimeout(r, ms));
  return value;
}

const race = new Proxy({}, FirstComeWins);
const res = [];
race.b = testAsync(20, 'slow', res);
race.a = testAsync(10, 'fast', res);
console.log(3, race.a instanceof Promise, race.b instanceof Promise);
await race.a;
console.log(3, race.a === 'fast', race.b instanceof Promise);
await race.b;
console.log(3, race.b === 'slow');
```

4. Several `Promise`s can be set for any one property. The value will then be set to the *first* property that is set. Thus, the outcome of two (or more) *async* functions can be ascribed to a property of the `FirstComeWins` object, they will race, and the first of the two *async* methods that return will set the property.

```javascript
async function testAsync(ms, value) {
  await new Promise(r => setTimeout(r, ms));
  return value;
}

const race = new Proxy({}, FirstComeWins);
race.a = testAsync(10, 'fast');
const promiseSlow = testAsync(20, 'slow');
race.a = promiseSlow;
await race.a;
console.log(4, 'fast' === race.a, promiseSlow); //promiseSlow still pending
await promiseSlow;
console.log(4, 'fast' === race.a, promiseSlow); //promiseSlow fulfilled
```

5. The `=` is a cause of confusion.

```javascript
async function testAsync(ms, value) {
  await new Promise(r => setTimeout(r, ms));
  return value;
}

const race = new Proxy({}, FirstComeWins);
const temp = race.a;
const one = (race.a = testAsync(20, 'a'));
console.log(5, one instanceof Promise, one !== race.a, temp === race.a);

let two;
race.b = (two = testAsync(10, 'b'));
console.log(5, two instanceof Promise, race.b !== two, race.b instanceof Promise);
```

6. Assert that the value of the `FirstComeWins` object is updated before any `then/await` callbacks are implemented, and that there are no "Promise chaining errors".

```javascript
async function testAsync(ms, value) {
  await new Promise(r => setTimeout(r, ms));
  return value;
}

const race = new Proxy({}, FirstComeWins);
const promise = testAsync(10, 'async');
race.a = promise;
const res = [];
(async () => res.push([await promise, race.a]))();
(async () => res.push([await race.a, race.a]))();
setTimeout(function () {
  console.log(6, JSON.stringify(res) === '["async", "async", "async", "async"]');
}, 15);
```

## Nested Proxy objects

`Proxy` objects can be nested.

```javascript
import FirstComeWins from

const CloneResponseProxy = {
  get: function (target, prop, receiver) {
    const og = Reflect.get(target, prop, receiver);
    return og instanceof Response ? og.clone() : og;
  }
};

const race = new Proxy(new Proxy({}, FirstComeWins), CloneResponseProxy);

const test = {};
race.test = test;
console.log(7, race.test === test);

const hello = new Response('hello');
race.a = hello;
console.log(7, race.a instanceof Response, race.a !== hello);

const sunshine = new Response('sunshine');
const promise = new Promise(r => setTimeout(() => r(sunshine), 10));
race.b = promise;
const fromOriginalPromise = await promise;
const fromTemporaryPromise = await race.b;
console.log(7, race.b instanceof Response, race.b !== hello);
console.log(7, race.b !== race.b);
```

## References