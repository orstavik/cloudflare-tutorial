# HowTo: regulate `Error`s?

We can write regulators that do not concern themselves with `Error`s when:

1. We only care about the original functions input; we have no interest in what happens *after* the original function has been invoked.
2. We **know** that all original functions passed to our FunFunFun will **never fail**. For this to be true, you must a) know that you never pass your functions the wrong argument types, and b) that there are no constellation of arguments that will trigger an `Error`, and c) that the original function doesn't depend on any system resource that might fail (network down?).
3. We deliberately *skip* handling the `Error`. When the original function throws an `Error` that is the same as *skipping all processing of the output in the regulator function*.

## HowTo: catch'n'release `Error`s?

As can be inferred from the list above, most regulators need to process `Error`s. Regulators do this in a process we can nickname catch'n'release:

1. The original function `throw`s an `Error`.
1. The regulator `catch` the `error`.
2. The `error` caught can be anything. Yes, *most often* it is an `Error` object, but it can be anything (`string`, `number`, another object, you name it).
3. To release, the regulator `throw`s the `error` (the regulator do *not* `return` it). This makes the regulator function behave similarly to the original function seen from the outside.

```javascript
function catchAndRelease(original) {
  return function regulator(...args) {
    try {
      const output = original(...args);
      console.log(original.name, 'output', output);                                 //[1]
      return output;
    } catch (error) {
      console.log(original.name, 'error', error);                                   //[2]
      console.log(error instanceof Object ? error.constructor.name : typeof error); //[3]
      throw error;
    }
  }
}

function throwError() {
  throw new Error('hello Error');
}

function throwWhatEver() {
  throw {'omg': 'wtf'};
}

const throwError2 = catchAndRelease(throwError);
const throwWhatEver2 = catchAndRelease(throwWhatEver);

try {
  throwError2();
} catch (err) {
  console.log(err);                                                                 //[4]
}
try {
  throwWhatEver2();
} catch (err) {
  console.log(err);                                                                 //[5]
}
```

Prints this:

```
//throwError2();
throwError error Error: hello Error      //[2]
Error                                    //[3]
Error: hello Error                       //[4]
//throwWhatEver2();
throwWhatEver error {omg: "wtf"}         //[2]
Object                                   //[3]
{omg: "wtf"}                             //[5]
```

## HowTo: normalize `Error`s?

Sometimes, a function can pass `Error` as a normal output. For example, `2/0 === NaN`, and `fetch()` can return a `404`. These are outputs that your function might consider an `Error`, and that you want to process as an `Error` in your code.

Sometimes, a function can `throw` an `Error` as something that you would like to consider a normal output. For example, `Math.pow(2, 'bob')` throws an `Error`, while you might like it to return `NaN`.

In both these instances, we can use regulator to normalize `Error` behavior in one way or the other.

```javascript
function textToNumber(arg) {
  if (typeof arg === 'string' || arg instanceof String) {
    const num = parseFloat(arg);
    if (num.toString() === arg)
      return num;
    return {'one': 1, 'two': 2, 'three': 3}[arg];
  }
  return arg;
}

function textMath(original) {
  return function regulator(...args) {
    try {
      return original(args.map(textToNumber));
    } catch (err) {
      return NaN;
    }
  }
}

const pow2 = textMath(Math.pow);
const sqrt2 = textMath(Math.sqrt);
const sixtyfour = pow2(4, 'three');
const seven = sqrt('49');
```

But. There are several drawbacks with this approach.

1. `Error` normalization is often a semantic task, ie. associated with a single function. For example, if you want to make `fetch()` calls that return a `status: 404` throw an `Error` instead, then this *only* apply to `fetch()`. Then you don't need a regulator.

```javascript
(function () {
  const fetchOG = fetch;
  window.fetch = function (...args) {
    const res = fetchOG(...args);
    if (res.status === 404)
      throw new Error('FileNotFoundError: ' + args[0] + ', ' + JSON.stringify(args[1]));
    return res;
  }
})();
```

2. You likely don't want to change the behavior of `fetch()`, you only need to change the behavior for one or two locations in your code. Thus, you only need to wrap `fetch()` and use if like so:

```javascript
function fetchFail404(...args){
  const res = fetch(...args);
  if (res.status === 404)
    throw new Error('FileNotFoundError: ' + args[0] + ', ' + JSON.stringify(args[1]));
  return res;
}
```

3. If you alter the semantics of a great many functions, such as *all* `Math.xyz` functions, and apply them throughout your app, you are essentially making your own dialect of JS. This is not recommended, for two of many reasons:
   1. it becomes harder for strangers to understand you,
   2. you can forget what you mean yourself (Once envisaged, the conventions of language are more difficult to remember than to change. Thus, staying with the convention everybody else agrees upon also gives you the assistance of the group in remembering the langauge conventions).


## References

* [MDN: Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
