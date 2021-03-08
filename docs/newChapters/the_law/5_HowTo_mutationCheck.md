# HowTo: check for mutations?

Mutations is a source of bugs. And mutations can be hard to discover and fix. Thus, in a perfect world, you should never mutate data on in your functions.

However. The world is not perfect. So, your code is filled with functions. That might mutate their input arguments. Or not. And you have a bug you don't understand. And it feels like one of your functions is doing a mutation that has escaped your watchful eyes. And, so, how can you detect this function with the least amount of effort?

## Step1: Hello mutant!

The basic mutation check looks like this:

```javascript
function mutationCheck(original) {
  return function mutationChecked(...args) {
    const before = args.map(a => JSON.stringify(a));
    const res = original(...args);
    const after = args.map(a => JSON.stringify(a));
    for (let i = 0; i < args.length; i++) {
      if (before[i] !== after[i])
        console.warn(`Hello mutant: ${original.name},arg nr ${i}, before value, after value: `, JSON.parse(before[i]), JSON.parse(after[i]));
    }
    return res;
  }
}
```

This mutation check works splendidly, with a couple of caveats:

1. the original, inspected functions are *sync*,
2. the input arguments are JSONable, and
3. the function doesn't do any JSON-invisible mutations such as converting `undefined` to `null`, or vice versa, or `delete` entries in an `Array` or properties in an `Object`, or similar.

If you need a custom comparator other than JSON, then no pattern can help you. You are on your own, you must write a custom function to create a signature of the objects/values you need to verify do not change.

## Step2: check async mutations

If you need to discover changes in async functions, we have got your back. Mutation checks only get interesting when we mix in async functions. Some of the most likely candidates for inspection are async.

Async functions might run in parallel, and they might access the same input arguments. To monitor such a situation, we need a CrowdControl mutation checker:

```javascript
function compareBeforeAfter(before, after) {
  const res = [];
  for (let i = 0; i < before.length; i++) {
    const b = before[i];
    const a = after[i];
    if (b !== a) res[i] = [b, a];
  }
  return res;
}

function mutantCheck(fun, before, args) {
  const after = args.map(a => JSON.stringify(a));
  const diff = compareBeforeAfter(before, after);
  if (diff.length)
    console.log('mutant detected. main suspect is: ', fun.name, diff);
  return diff;
}

function mutantCrowdController(...originals) {
  const activeFunctions = new Map();
  return originals.map(original => {
    return function mutationChecked(...args) {
      const before = args.map(a => JSON.stringify(a));
      const res = original(...args);
      if (!(res instanceof Promise)) {
        mutantCheck(original, before, args);
      } else {
        activeFunctions.set(res, original);
        res.finally(output => {
          activeFunctions.delete(res);
          const diff = mutantCheck(original, before, args);
          if (diff.length) {
            for (let otherFun of activeFunctions.values())
              console.log('additional mutant suspect: ', otherFun.name);
          }
        });
      }
      return res;
    }
  });
}

async function a(obj) {
  await new Promise(r => setTimeout(r, 50));
  obj.bob = 'alice';
}

async function b(obj) {
  await new Promise(r => setTimeout(r, 30));
  obj.alice = 'bob';
}

const [A, B] = mutantCrowdController(a, b);

(async function () {
  const test = {alice: 'hello', bob: 'sunshine'};
  A(test);  //this prints two candidates
  B(test);  //this prints one candidate

//todo this is not good enough.
//the mutations need to be registered in clusters.
//we need to check to see which functions are active at the same time.
//the second output should also list to potential candidates. it only lists one.

})();
```

## References

* 