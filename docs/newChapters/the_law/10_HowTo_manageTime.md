# HowTo: manage time?

In this article we describe how you monitor the timing of a set of functions *as an afterthought*.

## Regulator 1: `allInvoked(...originals)`

This FunFun observes the time when all the functions have been invoked once. The exact time the promise triggers is before the last function is called.

```javascript

function invoked(...originals) {
  let resolver;
  const allInvoked = new Promise(r => resolver = r);
  const invoked = new Set();
  const regulators = originals.map(original => {
    return function regulator(...args) {
      invoked.add(original);
      invoked.length === originals.length && resolver(true);
      return original(...args);
    }
  });
  return [allInvoked, ...regulators];
}
```

## Regulator 2: `currentlyActiveSettled(...originals)`

Observe a series of functions and test for unsettled async callbacks. The first output of the FunFun is a Promise that checks for any 'lingering' async function calls.

```javascript
function currentlyActiveSettled(...originals) {
  const promisesAwaiting = [];
  const regulators = originals.map(original => {
    return function regulator(...args) {
      const res = original(...args);
      res instanceof Promise && promisesAwaiting.push(res);
      return res;
    }
  });
  return [() => Promise.allSettled(promisesAwaiting), ...regulators];
}

//todo how to clean up the promisesAwaiting list?
```

## Regulator 2b: `settled(...originals)` recursive

Observe a series of functions and test for unsettled async callbacks. The first output of the FunFun is a Promise that checks for any 'lingering' async function calls. This version of the observer will also check if any new async callbacks of the function that are invoked while awaiting the current unsettled tasks.

```javascript
function settled(...originals) {
  const promisesAwaiting = [];
  const regulators = originals.map(original => {
    return function regulator(...args) {
      const res = original(...args);
      res instanceof Promise && promisesAwaiting.push(res);
      return res;
    }
  });

  async function ready() {
    const before = promisesAwaiting.length;
    await Promise.allSettled(promisesAwaiting);
    const after = promisesAwaiting.length;
    return before === after ? true : ready();
  }

  return [ready, ...regulators];
}
```

## Regulator 3: `invokedAndSettled(...originals)`

This regulator combines two of the regulators above to deliver a more complex time. It is that simple.

```javascript
function invokedAndSettled(...originals) {
  const [isInvoked, ...regulated] = invoked(...originals);
  const [ready, ...twiceRegulated] = settled(...regulated);
  const isInvokedAndSettled = isInvoked.then(() => ready());
  return [isInvokedAndSettled, ...twiceRegulated];
}

```

Simple solutions built with this pattern can replace both state management solutions such as Redux and development tools such as unit testing.

## References

* 

