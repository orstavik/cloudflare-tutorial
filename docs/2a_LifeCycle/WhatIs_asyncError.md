# WhatIs: an async `Error`?

> The short answer: a problem.

## HowTo: catch an `async Error`?

Usually, js can capture `async Error`s quite simply:

```javascript
async function omg() {
  await new Promise(r => setTimeout(r, 1000));
  throw 'error occurs after 1 sec';
}

(async function () {
  try {
    await omg();
  } catch (err) {
    console.log('you have captured an async Error: ', err);
  }
})();
```

Furthermore, `try/catch` captures `async Error`s under the `await`, and not under the function invocation.

```javascript
async function omg() {
  await new Promise(r => setTimeout(r, 1000));
  throw 'error occurs after 1 sec';
}

(async function () {
  const promise = omg();
  try {
    await promise;
  } catch (err) {
    console.log('you have captured an async Error: ', err);
  }
})();
```

This differs from the `try/catch` behavior around normal, sync functions:

```javascript
/*async*/
function omg() {
  //await new Promise(r=>setTimeout(r, 1000));
  throw 'error occurs immediately';
}

(async function () {
  let result;
  try {
    result = omg();
  } catch (err) {
    console.log('you have captured a sync Error: ', err);
  }

  try {
    await result;
  } catch (err) {
    console.log('there will be no error here, as you can await anything.');
  }
})();
```

## DoesIt: matter when the `async Error` occurs?

No. JS handling of `async Error`s are not influenced by when the `Error` occurs:

```javascript
async function omg() {
  throw 'error occurs immediately';
  await new Promise(r => setTimeout(r, 1000));
}

(async function () {
  const promise = omg(); //the async keyword returns an already rejected promise
  try {
    await promise;
  } catch (err) {
    console.log('you have captured an async Error: ', err);
  }
})();
```

## HowTo: delegate `async Error` management?

Partially. We can place a `try/catch` around a `Promise` that will be triggered when a `Promise` is rejected, but this will not *mute* other scopes that rely on the `Promise` result. This is a very tricky situation to navigate, and so I will give you two examples, one that work and another that doesn't work.

Yes, this demo works:

```javascript
async function omg() {
  await new Promise(r => setTimeout(r, 1000));
  throw 'error occurs after 1 sec';
}

async function errorHandler(promise) {
  try {
    await promise;
  } catch (err) {
    console.log("Error handling delegation.", err);
  }
}

(async function () {
  const promise = omg(100);
  errorHandler(promise);
})();
```

No, this demo doesn't work:

```javascript
async function omg() {
  await new Promise(r => setTimeout(r, 1000));
  throw 'error occurs after 1 sec';
}

async function errorHandler(promise) {
  try {
    await promise;
  } catch (err) {
    console.log("Error handling delegation.", err);
  }
}

(async function () {
  const promise = omg(100);
  errorHandler(promise);
  return promise;					//THIS LINE IS THE ONLY DIFFERENCE!!
})();
```

If the function that invokes the async function that will trigger an `Error` doesn't use or pass out the `Promise`, then `try/catch` error handling can be delegated. But as soon as we need to handle both the succesfull and unsuccesfull results, we need a better management of the output from the async function.

## HowTo: race between success and errors?

So. If we need a function that needs to react differently if an async function produce an `Error` or a successful result, then we need to wrap the calling of the async function inside another `Promise`, and then use the underlying `Promise.then().catch()` as vehicle for our response.

```javascript
function asyncErrorRace(fun, ...args) {
  let resultCallback, errorCallback;
  const resultPromise = new Promise(r => resultCallback = r);
  const errorPromise = new Promise(r => errorCallback = r);
  const promiseFromAsyncFunction = fun(...args);
  promiseFromAsyncFunction.then(result => resultCallback([result])).catch(reason => errorCallback(reason));
  return [resultPromise, errorPromise];    //handling async result and Error
}
```

## TrumpPromise

A promise that is rejected as soon as it is created. It will never/cannot resolve successfully. TrumpPromise NEVER wins a Promise.race. TrumpPromise always looses.

```javascript
let TrumpPromise;
(TrumpPromise = Promise.reject()).catch(r => r);

(async function () {
  const whatComesToThoseWhoWaits = new Promise(r => setTimeout(() => r('good things'), 1000));
  const outcome = await Promise.race([TrumpPromise, whatComesToThoseWhoWaits]);
  console.log(outcome); //good things
})();
```

## async and sync ErrorRace

A drawback of the above function, is that it will crash if the supplied `fun` is *sync*, ie. does not return a `Promise`. So, we extend the method to first screen for *sync* results and `Error`s, and then process the *async* result in the same way.

To fix this, we can solve the issue in the following way:

```javascript
let neverEndingPromise;
(neverEndingPromise = Promise.reject()).catch(r => r);

//The rejected promise will not win in a Promise.race.

function asyncErrorRace(fun, ...args) {
  let tempResult;
  try {
    tempResult = fun(...args);
    if (!(tempResult instanceof Promise))
      return [tempResult, neverEndingPromise]; //handle sync result
  } catch (err) {
    return [neverEndingPromise, err];          //handle sync Error
  }
  let resultCallback, errorCallback;
  const resultPromise = new Promise(r => resultCallback = r);
  const errorPromise = new Promise(r => errorCallback = r);
  tempResult.then(result => resultCallback([result])).catch(reason => errorCallback(reason));
  return [resultPromise, errorPromise];    //handling async result and Error
}
```

## ErrorRace with dependencies

It can be a little tricky to add async dependencies to the asyncErrorRace. This is how you do it:

```javascript
//first await all deps, then run the fun(...args), return {success, error} as promises in an object.
function asyncErrorRace(deps, fun, ...args) {
  let resCb, errCb, success = new Promise(r => resCb = r), error = new Promise(r => errCb = r);
  Promise.allSettled(deps).then(() => {
    try {
      const res = fun(...args);
      res instanceof Promise ? res.then(r => resCb(r), e => errCb(e)) : resCb(res);
    } catch (err) {
      errCb(err);
    }
  });
  return {success, error};
}
```

There are two alternative implementation to this one: alternatives that both fail if any of the dependencies represent a failing `Promise`. Both pass the error of the asyncErrorRace in the `Error` result, and the two methods has slightly different error message and logic.

```javascript
//will await all deps, then run the fun with ...args, and return a set of [success, error] promises.
function asyncErrorRaceFailDependency(deps, fun, ...args) {
  let resCb, errCb;
  const result = {success: new Promise(r => resCb = r), error: new Promise(r => errCb = r)};

  Promise.all(deps).then(function () {
    try {
      const res = fun(...args);
      res instanceof Promise ? res.then(r => resCb(r), e => errCb(e)) : resCb(res);
    } catch (err) {
      errCb(err);
    }
  }).catch(function () {
    errCb(new ReferenceError(`Function asyncErrorRace could not invoke "${fun.name}".`));
  });
  return result;
}

function asyncErrorRaceFailDependencyWithDetailedError(deps, fun, ...args) {
  let resCb, errCb;
  const result = {success: new Promise(r => resCb = r), error: new Promise(r => errCb = r)};

  Promise.allSettled(deps).then(function (depsState) {
    const rejectedIndex = depsState.findIndex(dep => dep.status === 'rejected');
    if (rejectedIndex >= 0) {
      const error = new ReferenceError(`Function asyncErrorRace could not invoke "${fun.name}". Dependency #${rejectedIndex} rejected.`);
      error.dependencyState = depsState;
      return errCb(error);
    }
    try {
      const res = fun(...args);
      res instanceof Promise ? res.then(r => resCb(r), e => errCb(e)) : resCb(res);
    } catch (err) {
      errCb(err);
    }
  });
  return result;
}
```

## Full demo 1: syncAsyncErrorRace

```javascript
let neverEndingPromise;
(neverEndingPromise = Promise.reject()).catch(r => r);

//The rejected promise will not win in a Promise.race.

function asyncErrorRace(fun, ...args) {
  let tempResult;
  try {
    tempResult = fun(...args);
    if (!(tempResult instanceof Promise))
      return [tempResult, neverEndingPromise]; //handle sync result
  } catch (err) {
    return [neverEndingPromise, err];          //handle sync Error
  }
  let resultCallback, errorCallback;
  const resultPromise = new Promise(r => resultCallback = r);
  const errorPromise = new Promise(r => errorCallback = r);
  tempResult.then(result => resultCallback([result])).catch(reason => errorCallback(reason));
  return [resultPromise, errorPromise];    //handling async result and Error
}

async function inner(x) {
  if (x < 0.25)
    throw new Error('immediate error');
  if (x < 0.5)
    return 'immediate sunshine';
  await new Promise(r => setTimeout(r, 10));
  if (x < 0.75)
    throw new Error('delayed error');
  return 'delayed sunshine';
}

function syncInner(x) {
  if (x < 0.5)
    throw new Error('immediate error');
  return 'immediate sunshine';
}

(async function () {
  for (let i = 0; i < 10; i++) {
    const [resultPromise, errorPromise] = asyncErrorRace(inner, i * 0.1);
    console.log(await Promise.race([resultPromise, errorPromise]));
  }
})();

setTimeout(async function () {
  for (let i = 0; i < 10; i++) {
    const [resultPromise, errorPromise] = asyncErrorRace(syncInner, i * 0.1);
    console.log(await Promise.race([resultPromise, errorPromise]));
  }
}, 1000);

function innerClosure(x) {
  if (x < 0.5)
    throw new Error('immediate error ' + this.foo);
  return 'immediate sunshine ' + this.foo;
}

setTimeout(async function () {
  const fun = innerClosure.bind({foo: "bar"});
  for (let i = 0; i < 10; i++) {
    const [resultPromise, errorPromise] = asyncErrorRace(fun, i * 0.1);
    console.log(await Promise.race([resultPromise, errorPromise]));
  }
}, 2000);
```

## Full demo 2: asyncErrorRace with dependencies

```javascript
  //will await all deps, then run the fun with ...args, and return a set of [success, error] promises.
function asyncErrorRaceFailDependency(deps, fun, ...args) {
  let resCb, errCb;
  const result = {success: new Promise(r => resCb = r), error: new Promise(r => errCb = r)};

  Promise.all(deps).then(function () {
    try {
      const res = fun(...args);
      res instanceof Promise ? res.then(r => resCb(r), e => errCb(e)) : resCb(res);
    } catch (err) {
      errCb(err);
    }
  }).catch(function () {
    errCb(new ReferenceError(`Function asyncErrorRace could not invoke "${fun.name}".`));
  });
  return result;
}

function asyncErrorRaceFailDependencyWithDetailedError(deps, fun, ...args) {
  let resCb, errCb;
  const result = {success: new Promise(r => resCb = r), error: new Promise(r => errCb = r)};

  Promise.allSettled(deps).then(function (depsState) {
    const rejectedIndex = depsState.findIndex(dep => dep.status === 'rejected');
    if (rejectedIndex >= 0) {
      const error = new ReferenceError(`Function asyncErrorRace could not invoke "${fun.name}". Dependency #${rejectedIndex} rejected.`);
      error.dependencyState = depsState;
      return errCb(error);
    }
    try {
      const res = fun(...args);
      res instanceof Promise ? res.then(r => resCb(r), e => errCb(e)) : resCb(res);
    } catch (err) {
      errCb(err);
    }
  });
  return result;
}

async function inner(x) {
  if (x < 0.25)
    throw new Error('immediate error');
  if (x < 0.5)
    return 'immediate sunshine';
  await new Promise(r => setTimeout(r, 1000));
  if (x < 0.75)
    throw new Error('delayed error');
  return 'delayed sunshine';
}

function innerSync(x) {
  if (x < 0.5)
    throw new Error('sync error');
  return 'sync sunshine';
}

//A TrumpPromise is a Promise that is silently invalidated at the very moment it is created.
//A TrumpPromise will never resolve successfully.
let TrumpPromise;
setTimeout(function () {
  (TrumpPromise = Promise.reject()).catch(r => r);
})
setTimeout(function () {
  //A TrumpPromise is a LOSER. They always LOSE any Promise.race([...]).
  //But, at the same time, they will do everything they can to block any other Promise in the race from finishing.
  //This can be very useful when you don't want a race to finish.
  console.log(Promise.race([TrumpPromise, new Promise(r => setTimeout(r, 4 * 365 * 24 * 3600 * 1000, 46))]).catch(r => r)); //never prints 46
  console.log(Promise.race([TrumpPromise, null]).catch(r => r));                                                  //never prints null
  console.log(Promise.race([TrumpPromise, undefined]).catch(r => r));                                             //never prints undefined
  console.log(Promise.race([TrumpPromise, new Error('Error, null, undefined, they all beat TrumpPromise')]).catch(r => r)); //never prints undefined

  //A TrumpPromise is asocial and will cause Promise.all([..]) to fail.
  //This is not a very useful property..
  Promise.all([TrumpPromise, new Error('Errors are not as bad'), null, undefined]).catch(err => console.log('failed to do anything')); //will throw an Error.
}, 100)


setTimeout(async function () {
  const deps = [Promise.resolve(), undefined, 1, new Promise(r => setTimeout(r, 10))];
  let {success: resultPromise, error: errorPromise} = asyncErrorRace(deps, inner, 0);
  let {success: resultPromise1, error: errorPromise1} = asyncErrorRace(deps, inner, 0.4);
  let {success: resultPromise2, error: errorPromise2} = asyncErrorRace(deps, inner, 0.7);
  let {success: resultPromise3, error: errorPromise3} = asyncErrorRace(deps, inner, 1);
  let {success: resultPromise4, error: errorPromise4} = asyncErrorRace(deps, innerSync, 0);
  let {success: resultPromise5, error: errorPromise5} = asyncErrorRace(deps, innerSync, 1);
  console.log(await Promise.race([resultPromise, errorPromise]));
  console.log(await Promise.race([resultPromise1, errorPromise1]));
  console.log(await Promise.race([resultPromise2, errorPromise2]));
  console.log(await Promise.race([resultPromise3, errorPromise3]));
  console.log(await Promise.race([resultPromise4, errorPromise4]));
  console.log(await Promise.race([resultPromise5, errorPromise5]));
});
setTimeout(async function () {
  const errorDeps = [TrumpPromise, Promise.resolve(), undefined, 1, new Promise(r => setTimeout(r, 10))];
  const {success, error} = asyncErrorRace(errorDeps, inner, 0);
  const res = await Promise.race([success, error]);
  console.log(res, res.dependencyState);
}, 3000);
setTimeout(async function () {
  const errorDeps = [TrumpPromise, Promise.resolve(), undefined, 1, new Promise(r => setTimeout(r, 10))];
  const {success, error} = asyncErrorRaceFailDependency(errorDeps, inner, 0);
  const res = await Promise.race([success, error]);
  console.log(res, res.dependencyState);
}, 3500);
setTimeout(async function () {
  const errorDeps = [TrumpPromise, Promise.resolve(), undefined, 1, new Promise(r => setTimeout(r, 10))];
  const {success, error} = asyncErrorRaceFailDependencyWithDetailedError(errorDeps, inner, 0);
  const res = await Promise.race([success, error]);
  console.log(res, res.dependencyState);
}, 4000);
```

## References

* dunno

## old drafts, can be deleted I think

```javascript
async function omg() {
  await new Promise(r => setTimeout(r, 1000));
  throw 'error occurs after 1 sec';
}

async function errorHandler(promise) {
  try {
    await promise;
  } catch (err) {
    console.log("Error handling delegation.", err);
  }
}

//async function callAwaitCatch(asyncFun, ...args){
//  const promise = asyncFun(...args);
// errorHandler(promise);
//}

(async function () {
  const promise = omg(100);
  errorHandler(promise);
  //callAwaitCatch(omg, 100);
})();
```

```javascript
//this works
async function omg() {
  throw 'error occurs immediately';
  await new Promise(r => setTimeout(r, 1000));
  //return 'hello';
}

async function delegateHandlingCatchDoesntWork(promise) {
  try {
    await promise;
  } catch (err) {
    console.log("you have captured an async Error, but not in the same scope as from where the async function was invoked, and so this doesn't matter", err);
  }
}

async function callAwaitCatch(asyncFun, ...args) {
  const promise = asyncFun(...args);
  delegateHandlingCatchDoesntWork(promise);
  return promise;
}

(async function () {
  await callAwaitCatch(omg, 100);
})();
```

if you invoke an async function dynamically, the js run-time doesn't recognize the "asyncness" of the `try`

When an `async` function throws an `Error`, the `Error` is sometimes thrown during function invocation, and sometimes when the result is `await`ed. This means that relying on `try{...}catch(error){...}` is unsafe.

```javascript
async function a() {
  throw new Error('before the inner await');
  await new Promise(r => setTimeout(r, 10));
}

async function b() {
  await new Promise(r => setTimeout(r, 10));
  throw new Error('after the inner await');
}

(async function () {
  let A, B, resolvedA, resolvedB;

  A = a();
  B = b();

  try {
    resolvedA = await A;
  } catch (err) {
    console.log(err.message);
  }

  try {
    resolvedB = await B;
  } catch (err) {
    console.log(err.message);
  }
  console.log(resolvedA === resolvedB && resolvedA === undefined); //true
})();
```

Instead, we must rely on `.then(...)` and `.catch(...)`.

## WhatIs: an AsyncErrorRace?

An AsyncErrorRace occurs when:

1. the `async` function might throw an `Error`. By default, all `async` functions should be considered to produce exceptions, as most `async` operations rely on sub systems that might cause `Error`s. There are some exceptions of async functions that can be reliably called without considering `Error`s, such as `setTimeout` and `crypto` functions.
2. when the function calling the `async` function needs to use the result from the `async` function which might throw an `Error`. Which again is the default mode of operation, as most `async` functions produce a result that is parsed/handled by the caller.

The AsyncErrorRace thus essentially need to wait for one of two results: a success or an `Error`. But, as we cannot trust `try {...} catch(err){...}` to do its job properly, we implement a wrapper function around the call to the `async` function that will return two results `[successfulResult, error]`.

```javascript
  async function errorRace(fun, ...args) {
  let resultCallback;
  const resultPromise = new Promise(r => resultCallback = r);
  fun(...args).then(result => resultCallback([result])).catch(reason => resultCallback([, reason]));
  return resultPromise;
}

async function inner(x) {
  if (x < 0.25)
    throw new Error('immediate error');
  if (x < 0.5)
    return 'immediate sunshine';
  await new Promise(r => setTimeout(r, 10));
  if (x < 0.75)
    throw new Error('delayed error');
  return 'delayed sunshine';
}

(async function () {
  for (let i = 0; i < 10; i++)
    console.log(await errorRace(inner, Math.random()));
})();
```

## Error race condition: race those `Error

## demo

```javascript
async function doA() {
  await new Promise(r => setTimeout(r, Math.random() * 10));
  throw new Error('omg');
}

async function doB() {
  await new Promise(r => setTimeout(r, Math.random() * 10));
  return new Response('hello sunshine');
}

async function getErrorFromAwait(errorCallback, promise, status, publicMessage) {
  try {
    await promise;
  } catch (err) {
    err.status = status;
    err.publicMessage = publicMessage;
    errorCallback(err);
  }
}

async function errorToResponse(error) {
  const e = await error;
  return new Response(e.publicMessage + e.message, {status: e.status || 200});
}

async function handleRequest(request) {
  let a, b;
  a = doA();
  b = doB();

  let errorCallback;
  const error = new Promise(r => errorCallback = r);
  getErrorFromAwait(errorCallback, a, 403, 'wtf');

  return Promise.race([b, errorToResponse(error)]);
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});

```