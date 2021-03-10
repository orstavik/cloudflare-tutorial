# HowTo: manage state?

In this article we will describe how you can use regulators to manage state *as an afterthought*. It is truly wonderful.

```javascript
function stateManager(...originals) {
  const trace = [];
  let count = 0;
  const regulators = originals.map(original => {
    const name = original.name;
    const regulator = function (...args) {
      const id = count++;
      try {
        trace.push({id, name, args});
        const output = original(...args);
        if (!(output instanceof Promise)) {
          trace.push({id, name, type: 'sync', output});
          return output;
        }
        const asyncStatus = {id, name, type: 'async', promise: output, pending: true};
        trace.push(asyncStatus);
        output.then(output => trace.push({id, name, type: 'async', output}));
        output.catch(error => trace.push({id, name, type: 'async', error}));
        output.finally(() => asyncStatus.pending = false);
      } catch (error) {
        trace.push({id, type: 'sync', name, error});
        throw error;
      }
    };
    Object.defineProperty(regulator, 'name', {value: '_sm_' + name});
    return regulator;
  });

  function inspectState(obj) {

  }
  
  function isFinished(recursive){
    
  }

  return [inspectState, ...regulators];
}

function sumImpl(a, b) {
  return a + b;
}

const [callSequence, sum, pow, sqrt] = listInvocations(sumImpl, Math.pow, Math.sqrt);

function hypotenuse(a, b) {
  return sqrt(sum(pow(a, 2), pow(b, 2)));
}

console.log(hypotenuse(3, 4)); // 5
console.log(callSequence);    // ["pow", "pow", "sumImpl", "sqrt"]
```

Simple solutions built with this pattern can replace both state management solutions such as Redux and development tools such as unit testing. It is truly powerful stuff.

## References

* 

