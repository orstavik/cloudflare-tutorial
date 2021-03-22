# HowTo: accumulate?

This is a FIDO, iterative function.

The hoarder regulator is an async function, obviously, as it will accumulate all invocations for a certain period of time before actually trying to execute it. So, even though the original function might not have been an async function to begin with, it will be async once the hoarder regulator is "added to it".

```javascript
function hoard(original, ms = 25000) {
  let accumulat = [];
  let finishedYet;
  const regulator = function (...args) {
    accumulat.push(args);
    if (finishedYet)
      return finishedYet;
    //setTimeout never fails.
    return finishedYet = new Promise(r => setTimeout(r, ms)).then(() => {  
      finishedYet = undefined;
      const tmp = accumulat;
      accumulat = [];
      return original(tmp); //original here might be sync or async, but it shouldn't matter
    });
  }
  Object.defineProperty(regulator, 'name', '_acc_' + original.name);
  return [() => finishedYet, regulator];
}

```

## References

* 