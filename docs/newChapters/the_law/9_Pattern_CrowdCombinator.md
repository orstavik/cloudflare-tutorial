# Pattern: CrowdCombinator

The CrowdCombinator pattern enable you to create a set of regulator functions from a set of original functions, and *coordinate* the actions of the set of regulators as a group.

The general use case for CrowdCombinators is "to manage state and time". In the next chapters we will look at state and time management more in depth.

## WhatIs: a CrowdCombinator?

A CrowdCombinator makes *three* additions to a normal combinator:

1. The CrowdCombinator takes a *list* of original functions as input and outputs a *list* of regulator functions.
2. The CrowdCombinator establishes a) a closure that b) can hold variables that c) all its regulators can access, but that d) are hidden from interference from outside.
3. The CrowdCombinator returns an **extra output**. The extra output is either a `function` or a `Promise`, and it should be returned as the *last* output of the CrowdCombinator. The extra output is optional, but most CrowdCombinators need/benefit greatly from it.

The basic principle behind a CrowdCombinator is as follows:

```javascript
function crowdCombinator(...originals) {
  let closureState = 'This state is shared between all regulators';

  function extraOutput() {
    return closureState;
  }

  const regulators = originals.map(original => {
    return function regulator(...args) {
      //regulate the original function in light of the closureState
      return original(...args);
    };
  });
  return [...regulators, extraOutput];
}
```

## Demo: `callSequence`

The demo below observes and records the callSequence for a set of original functions.

```javascript
function callSequenceCombinator(...originals) {
  const invocations = [];

  function readCallSequence() {
    return [...invocations];
  }

  const regulators = originals.map(original => {
    return function regulator(...args) {
      invocations.push(original.name);
      return original(...args);
    }
  });
  return [...regulators, readCallSequence];
}

function sumImpl(a, b) {
  return a + b;
}

const [sum, pow, sqrt, callSequence] = callSequenceCombinator(sumImpl, Math.pow, Math.sqrt);

function hypotenuse(a, b) {
  return sqrt(sum(pow(a, 2), pow(b, 2)));
}

console.log(hypotenuse(3, 4)); //=> 5
console.log(callSequence());   //=> ["pow", "pow", "sumImpl", "sqrt"]
```

## References

* 