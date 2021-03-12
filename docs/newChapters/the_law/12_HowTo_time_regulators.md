# HowTo: time regulators?

You can delay the processing of both the regular output and/or the `Error` in your regulator. All the well known candidates for queueing tasks works: `setTimeout(...)`, `requestAnimationFrame(...)`, and `Promise.resolve().then(()=>...)`.

## Demo: `delayMicroTaskQueue()` regulator

```javascript
function delayMicroTaskQueue(original) {
  return async function regulator(...args) {
    await Promise.resolve();
    return original(...args);
  }
}

function observeFastAndSlowOutput(original) {

  function processOutput(output) {
    console.log(original.name, output);
  }

  function processError(error) {
    console.warn('error', original.name, error);
  }
  
  processOutput = delayMicroTaskQueue(processOutput);
  processError = delayMicroTaskQueue(processError);

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
```

## Discussion

To delay the postProcessing of the output/`Error` in a regulator is not commonly something that you want. Maybe especially with `async` regulators that are already complex enough as they are in what happens when and why. However, later we will revisit functions that control/review the timing of your functions, and here you might wish to add a regulator inside your regulator, for specific control.

## References

*  