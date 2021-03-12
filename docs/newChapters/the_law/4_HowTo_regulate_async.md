# HowTo: regulate `async`?

One of the most difficult things to observe, log, debug, test, learn and analyze are `async` function calls, sequences, and state. Thus, processing `async` output from your original functions is one of the core tasks of regulators. To describe how a regulator should process `async` functions, we start simple, and then make more powerful.

## Demo: always `async`

The simplest approach to `async` is to *always `async`*. For example, imagine you have an original function that you want to observe the output from. The original function is async, so we must await the output of the original function.

```javascript
function observeSlowOutput(original) {
  return async function regulator(...args) {
    const output = await original(...args);
    console.log(original.name, output);
    return output;
  }
}

async function slowPlus(a, b) {
  await new Promise(r => setTimeout(r, 10));
  return a + b;
}

function fastPlus(a, b) {
  return a + b;
}

const slowPlus2 = observeSlowOutput(slowPlus);
const fastPlus2 = observeSlowOutput(fastPlus);

const allGoodThings = slowPlus2(1, 2);
const moreGoodThings = fastPlus2(1, 2);
//fastPlus 3
//slowPlus 3
```

## Demo: sometimes `async`

The drawback of the above demo is that it will not only `await` the `async` original functions, but also needlessly force an `await` on *sync* original functions. This is not good. This means that the regulators you produce *must be `await`ed* in their context of use, even when you pass them an original function you *know to be sync*. If you are writing regulators that you intend to reuse across your codebase (which you can do with regulators), then this is far less than optimal.

To write regulator functions that only apply an `async` processing of the original functions output when that output is `async`, you need a regulator that directly process with `Promise`.

```javascript
function observeFastAndSlowOutput(original) {

  function processOutput(output) {
    console.log(original.name, output);
  }

  return function regulator(...args) {
    const output = original(...args);
    if (output instanceof Promise) {
      output.then(output2 => processOutput(output2));
    } else {
      processOutput(output);
    }
    return output;
  }
}

async function slowPlus(a, b) {
  await new Promise(r => setTimeout(r, 10));
  return a + b;
}

function fastPlus(a, b) {
  return a + b;
}

const slowPlus2 = observeFastAndSlowOutput(slowPlus);
const fastPlus2 = observeFastAndSlowOutput(fastPlus);

const allGoodThings = slowPlus2(1, 2);
const moreGoodThings = fastPlus2(1, 2);
console.log('hello sunshine');
//fastPlus 3
//hello sunshine
//slowPlus 3
```

## Demo: sometimes `async`, sometimes `Error`

Here is a regulator that handle both `async`, sync, `throw` and `return` output from an original function.

```javascript
function observeFastAndSlowOutput(original) {

  function processOutput(output) {
    console.log(original.name, output);
  }
  function processError(error) {
    console.warn('error', original.name, error);
  }

  return function regulator(...args) {
    try {
      const output = original(...args);
      if (output instanceof Promise) {
        output.then(output2 => processOutput(output2));
        output.catch(error => processError(error));
      } else {
        processOutput(output);
      }
      return output;
    } catch (error) {
      processError(error);
      throw error;
    }
  }
}

async function slowPlus(a, b) {
  await new Promise(r => setTimeout(r, 10));
  if (a === 0)
    throw {omg: 'wtf'};
  return a + b;
}

function fastPlus(a, b) {
  if (a === 0)
    throw NaN;
  return a + b;

}

const slowPlus2 = observeFastAndSlowOutput(slowPlus);
const fastPlus2 = observeFastAndSlowOutput(fastPlus);

const allGoodThings = slowPlus2(1, 2);
const moreGoodThings = fastPlus2(1, 2);
console.log('hello sunshine');
try {
  const auch = fastPlus2(0, 2);
} catch (error) {
  console.log("hello error");
}

try {
  const auch = await slowPlus2(0, 2);
} catch (error) {
  console.log("hello async error");
}

//fastPlus 3
//hello sunshine
//error fastPlus NaN
//hello error
//slowPlus 3
```

## References

*  