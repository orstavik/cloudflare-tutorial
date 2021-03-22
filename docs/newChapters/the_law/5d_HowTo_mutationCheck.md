# HowTo: check for mutations?

Mutations is a source of bugs. And mutations can be hard to discover and fix. Thus, in a perfect world, you should never mutate data on in your functions.

However. The world is not perfect. So, your code is filled with functions. That might mutate their input arguments. Or not. And you have a bug you don't understand. And it feels like one of your functions is doing a mutation that has escaped your watchful eyes. And, so, how can you detect this function with the least amount of effort?

## Step1: Hello mutant!

The basic mutation check looks like this:

```javascript
function mutationCheck(original) {
  return function mutationChecked(...args) {
    const before = JSON.stringify(args);
    const res = original(...args);
    const after = JSON.stringify(args);
    if (before !== after)
      console.warn("Hello mutant!", original.name, "before:", before, "after:", after);
    return res;
  }
}
```

This mutation check works splendidly, with a couple of caveats:

1. the original, inspected functions are *sync*,
2. the input arguments are JSONable, and
3. the function doesn't do any JSON-invisible mutations such as converting `undefined` to `null`, or vice versa, or `delete` entries in an `Array` or properties in an `Object`, or similar.

If you need a custom comparator other than JSON, then no pattern can help you. You are on your own. You must write a custom function to create a signature of the objects/values you need to verify do not change.

## Step2: check async mutations

Mutation checks get reeeeally interesting when we mix in async functions. And. Async mutation detection is not as simple as one might hope:

1. Async functions might run in parallel, and they might access the same input arguments. Thus, even though you discover a mutation, you will not be able to pinpoint exactly where the mutation occurred. Never. Not while JS is JS. All you can detect programmatically are some likely candidates which *might* perform the mutation.
2. An async mutation checker is therefore best suited to run a full check of all async functions at all times. This is the best means to pinpoint when and where.

To monitor such a situation, we need a CrowdControl mutation checker. We can use this CrowdControl checker to give us more accesspoints at the beginning and end of as many functions as possible/relevant, to give us as much information as possible when chasing the mutation bug.

```javascript
function checkAsyncArguments(argsToAsyncActive, msg) {
  const mutants = argsToAsyncActive.filter(({before, args}) => before !== JSON.stringify(args));
  if (!mutants.length)
    return;
  console.warn(`Async mutation detected ${msg}:`);
  for (let entry of mutants) {
    const {args, before, original} = entry;
    var now = JSON.stringify(args);
    console.warn(`arguments of ${original.name}() has changed:`);
    console.log('before', before);
    console.log('now', now);
    entry.before = now; //I know. How could I. I truly am a dishonest. ;)
  }
}

function mutantCrowdController(...originals) {
  const asyncs = [];
  return originals.map(original => {
    return function mutationChecked(...args) {
      checkAsyncArguments(asyncs, `before an invocation of ${original.name}()`);
      const before = JSON.stringify(args);
      const res = original(...args);
      if (!(res instanceof Promise)) {
        const after = JSON.stringify(args);
        if (before !== after) {
          console.warn('sync mutation: ', original.name, before, after);
          checkAsyncArguments(asyncs, `after an invocation of ${original.name}()`);
        }
      } else {
        const checkEntry = {args, before, original};
        asyncs.push(checkEntry);
        res.finally(output => {
          checkAsyncArguments(asyncs, `when an async ${original.name}() resolved`);
          asyncs.splice(asyncs.indexOf(checkEntry), 1);//Again! I know. Lazy bum..
        });
      }
      return res;
    }
  });
}

async function a(obj) {
  await new Promise(r => setTimeout(r, 50));
  obj.a = null;
}

async function b(obj) {
  await new Promise(r => setTimeout(r, 30));
  obj.b = null;
}

const [A, B] = mutantCrowdController(a, b);

(async function () {
  const test = {a: 'hello', b: 'sunshine'};
  A(test);  //this prints two candidates
  B(test);  //this prints one candidate
})();
```

Detecting mutations is hard core. It is not for sissies. You have been warned. You have been challenged. 

## References

* 