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

## Demo: CrowdControl limits

The main limitation of the CrowdControl pattern is that it is shallow, not deep. This means that the inner references in the original functions are not affected. This in turn means and that calls to other functions in your original functions are not regulated, which in turn means that inner function calls will not be routed to regulator derivatives, but remain bound to their original function siblings. This can be a bit confusing to begin with.

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

function hypotenuseImpl(a, b) {
  return sqrt(sum(pow(a, 2), pow(b, 2)));
}

const [sum, pow, sqrt, hypotenuse, callSequence] = callSequenceCombinator(sumImpl, Math.pow, Math.sqrt, hypotenuseImpl);

console.log(hypotenuse(3, 4)); //=> 5
console.log(callSequence());   //=> ["hypotenuseImpl"]
```

However. This limitation is **good**, not bad. The reasons are:

1. Most often, the functions regulated are not declared in the same scope as they are in this demo; most often, the original functions are declared in other lexical scopes and imported into the context where they are regulated, and in such a situation, you most likely would *not* like to regulate their inner function calls. If you were to regulate `Math.pow` and `Math.hypot`, you are probably ok with the fact that when `Math.hypot` calls its inner `pow` function, it is ok that this is not routed via your regulated version of `Math.pow`.

2. What you see is what you get. You don't have to imagine anything. This means that regulators are essentially either a) a per function and per frame creature (utterly local, like variables), or b) completely global (regulators are used to replace their original counter part on global objects). This matches 1:1 with the true behavior of JS, when we exclude the confusing syntactic sugar that is `function name(){..` => `var name = function name(){..`.

## References

* 