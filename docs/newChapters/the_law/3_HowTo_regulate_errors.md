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
      console.log(original.name, 'output', output);
      return output;
    } catch(error){
      console.log(original.name, 'error', error);
      console.log(error instanceof Object ? error.constructor.name: typeof error);
      throw error;
    }
  }
}

function throwError(){
  throw new Error('hello Error');
}

function throwWhatEver(){
  throw {'omg': 'wtf'};
}

const throwError2 = catchAndRelease(throwError);
const throwWhatEver2 = catchAndRelease(throwWhatEver);

throwError2();
throwWhatEver();
```

## HowTo: normalize `Error`s?


## References

* add mdn to Function.name 