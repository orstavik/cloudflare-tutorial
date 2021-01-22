# Implement: WrapResultError

The `wrapResultError` is a method that will invoke a function that takes its argument from a context object. `wrapResultError` tackles both async and sync functions.

`{success, error, cancel} = wrapResultError(context, fun, args, goal)`

* The `context` is an object (`FirstComeWins`).
* The `fun` is an AsyncDecorator observer or decorator.
* The `args` is a list of `string`s that represent properties on the `context` object. When all required properties are resolved, they are passed as arguments to `fun` and `fun` is invoked.
	* If an `arg` starts with a `*`, it is optional, and it will not delay invocation of `fun`. If an `arg` is not resolved when `fun` is invoked, `undefined` is passed instead.
* The `goal` is a property on the `context` that the `wrapResultError(..)` will populate. If the `goal` property is set to something other than a `Promise` before the `fun` is invoked, `wrapResultError(..)` will cancel the action.

## sync vs. async invocation

`wrapResultError(..)` will invoke the `fun` once all `args` are resolved. If the `args` includes the result of one or more `async` functions (includes at least one `Promise`), then the invocation is delayed until `Promise.allSettled(argsFromContext)` resolves. In such circumstances the `wrapResultError(..)` will not know if the `fun` will throw an `Error` or run normally, and thus must return two `Promise`s.

However. If the current state of the required `args` as `context` object properties are all set to a resolved value, then `fun` can be invoked immediately. If the `fun` represent a sync function that returns a non-`Promise` value, then `wrapResultError(..)` can return the `success` or `error` immediately. This we call a sync invocation.

## `cancel`

If the goal of the function invocation is already met by other means before the invocation is first requested, or before the arguments are resolved, then `wrapResultError(..)` is canceled. If this happens during sync invocation, a value of `cancel` is returned instead of a value of `success` and/or `error`.

## Implementation

```javascript
function goalIsMet(context, goal){
  return Object.getOwnPropertyNames(context).indexOf(goal) !== -1 && !(context[goal] instanceof Promise);
}

function argValueRightNow(context, arg){
  arg = arg[0] === '*' ? arg.substr(1) : arg;
  return context[arg] instanceof Promise ? undefined : context[arg]; 
}

function requiredArgs(context, args){
  return args.filter(arg => arg[0] !== '*').map(arg => context[arg]).filter(arg => arg instanceof Promise);
}

function wrapResultError(context, fun, args, goal) {
  const awaitArgs = requiredArgs(context, args);
  if (!awaitArgs.length) {        //attempt fully sync management
    if (goalIsMet(context, goal))
      return {cancel: true};
    const argsRightNow = args.map(arg => argValueRightNow(context, arg));
    try {
      const res = fun(...argsRightNow);
      if (!(res instanceof Promise))
        return {success: res};
      let resCb, errCb;
      const success = new Promise(r => resCb = r), error = new Promise(r => errCb = r);
      res.then(r => resCb(r), e => errCb(e));
      return {success, error};
    } catch (err) {
      return {error: err};
    }
  }
  let resCb, errCb;
  const success = new Promise(r => resCb = r), error = new Promise(r => errCb = r);
  Promise.allSettled(awaitArgs).then(() => {
    if (goalIsMet(context, goal))
      return; //todo should this be notified somewhere.
    const argsRightNow = args.map(arg => argValueRightNow(context, arg));
    try {
      const res = fun(...argsRightNow);
      res instanceof Promise ?
        res.then(r => resCb(r), e => errCb(e)) :
        resCb(res);
    } catch (err) {
      errCb(err);
    }
  });
  return {success, error};
}
```

## Tests

1. The asyncErrorRace will run any function against a given list of arguments. The function receives its arguments as an object with an array of string properties.

```javascript
const a = wrapResultError(
  hello => 'hello ' + hello,
  {hello: 'sunshine'},
  ['hello']
);
const b = wrapResultError(
  hello => 'hello ' + hello,
  {hello: 'sunshine', waitForIt: new Promise(r => setTimeout(r, 100))},
  ['hello', 'waitForIt']);
console.log(a.success === 'hello sunshine');
console.log(b.success instanceof Promise)
console.log(await b.success === 'hello sunshine');
```

2. The function returns an object with {success, error} values.

* If an error is thrown during the execution, then the error value will be populated.
* If no error occurs during the execution, then the success value will be filled.

```javascript
const a = wrapResultError(
  hello => {
    throw new Error('error rain')
  },
  {hello: 'sunshine'},
  ['hello']
);
const b = wrapResultError(
  hello => {
    throw new Error('error rain')
  },
  {hello: 'sunshine', waitForIt: new Promise(r => setTimeout(r, 100))},
  ['hello', 'waitForIt']);
console.log(a.success instanceof Promise);
console.log(a.error.message === 'error rain');
console.log(b.success instanceof Promise)
console.log(b.error instanceof Promise)
console.log((await b.error).message === 'error rain');
```

3. The asyncErrorRace can also run async functions. If the function returns a Promise, then when that Promise resolves, it will resolve the {success} value, and if that Promise fails, it will resolve the {error} value.

```javascript

const a = wrapResultError(
  async hello => {
    await new Promise(r => setTimeout(r, 100));
    return 'hello ' + hello
  },
  {hello: 'sunshine'},
  ['hello']
);
const b = wrapResultError(
  async hello => {
    await new Promise(r => setTimeout(r, 100));
    throw new Error('error rain')
  },
  {hello: 'sunshine', waitForIt: new Promise(r => setTimeout(r, 100))},
  ['hello', 'waitForIt']);
console.log(a.success instanceof Promise, a.error instanceof Promise);
console.log(b.success instanceof Promise, b.error instanceof Promise);
const aSuccess = await a.success;
console.log(aSuccess === 'hello sunshine');
const bError = await b.error;
console.log(bError.message === 'error rain');
```

4. The function will not run until all arguments are resolved

* To allow a function to run even though one or more arguments are not resolved, mark the optional arguments with a '*' prefix.

If none of the arguments given in are `Promise`s, the function will run sync/immediately.

```javascript

const b = wrapResultError(
  (hello, waitForIt) => 'hello ' + hello + waitForIt,
  {hello: 'sunshine', waitForIt: new Promise(r => setTimeout(r, 100))},
  ['hello', '*waitForIt']);
console.log(b.success === 'hello sunshineundefined');
```

5. TODO Test that the goal is met
6. TODO test the new code clean up.

## References 
