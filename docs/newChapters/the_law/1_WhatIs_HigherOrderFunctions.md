# WhatIs: higher-order functions?

A higher-order function (hof) is a function that either takes a function as an argument and/or returns a function as its result.

## 1. Iterative higher-order functions (function in, data out)

Native Javascript use hofs in many different places:

* `addEventListener(..)`,
* `setTimeout(..)`,
* `setInterval(..)`,
* `requestAnimationFrame(..)`,
* `Array.prototype.map(..)`,
* `Array.prototype.filter(..)`,
* `Array.prototype.sort(..)`,
* `Array.prototype.find(..)`,

What is common with the native Javascript hofs is:

1. They ***ITERATE*** over a set of data:
	* The `addEventListener(..)` function iterates over all future instances of the observed event;
	* the `setTimeout(..)` function iterates over the coming time interval, and stops after the first; and
	* the `map(..)` iterates over the entries in the `Array`.

2. We pass them ***ONE INPUT FUNCTION***. The *input function* is what makes them "higher-order". The input function is used in *each step of the above describing interation*.

3. They are associated with an ***ORIGIN OBJECT***: The `.map(..)` is a method on an `Array`; the `addEventListener(..)` is a method on a `DOMNode`; the `setTimeout(..)` is associated with the `window`. The native hofs can also be given other values as data (`ms` in `setTimeout` or `type` for `addEventListener(..)`, but this is not critical).

4. They ***RETURN a VALUE*** or a data object: `addEventListener(..)` return `undefined`; `Array.prototype.filter(..)` return another array; and `setTimeout(..)` return an integer. What is particularly important to note here is that they by design do ***NOT*** return a function(!). Yes, you *can* make functions such as `Array.reduce(..)` return a `function`, but that is at best an edge case used one in a thousand.

One could have made some of the native Javascript hofs return a function. For example, Javascript could easily have made `setTimeout(..)` return a specific `clearTimeout()` function, instead of a specific integer that is passed to a generic `clearTimeout()` function. However, the choice was made to keep the output a value, likely because it would be simpler to conceptually grasp and more efficient for memory and computation.

## 2. Machine Learning higher-order functions (data in, function out)

In this article, we will not discuss machine learning hofs. Yet. A machine learning hof takes in pure values and data objects (non functions), and then produce a function. Machine learning function = values in, function out.

You feed a HO function with a set of data (training set). The HO function processes this input data to create a) tables, b) vectors, c) products, and even d) brand new algorithms which it fills a brand new, never-seen-before function that can then replicate, reuse, guess, simulate, contradict, or do anything else based on similar or completely different input. The sky is the limit.

## 3. Regulator higher-order functions (function in, function out)

> To 'regulate' stems from the latin word 'regula' which means 'rule'.

This chapter concerns **regulator** higher-order functions. At their core, regulator higher-order functions:

1. take an input function (called the **original** function),

2. creates and returns a new wrapper function (called the **regulated** function) that:
	1. takes a set of arguments,
	2. regulate the arguments,
	3. calls the original function with its arguments,
	4. regulate the output from the original,
	5. returns the regulated output as its own.

Below is a simple JS sketch of the concept. 

```javascript
function regulatorFunction(original) {
  return function regulated(...args) {
    //regulate input
    const originalResult = original(...args);
    //regulate output
    return originalResult;
  }
}

const myRegulatorFunction = regulatorFunction(myOriginalFunction);
const x = myRegulatorFunction(1, 2, 3);
```

Note: regulator hofs can also:
 * produce *additional* output values/functions and
 * produce a *list of* output functions from an equivalent list of input functions.

However, once the concept becomes clear, these added abilities will make more sense.

## WhatIs: regulate (i)? observe

The first thing a regulator function does is simply to **observe** the input and output of an original function.

```javascript
function regulator(original) {
  return function observed(...args) {
    console.log('input to: ', original.name, args);
    const originalResult = original(...args);
    console.log('output from: ', original.name, originalResult);
    return originalResult;
  }
}

Math.abs = regulator(Math.abs);
Math.abs(-12); 
//input to: ', abs, [-12] 
//output from: ', abs, 12 
```

The use case for simply **observing** the input and output of particular functions are: 
 * debugging, 
 * logging, 
 * unit testing,
 * user analytics, 
 * machine learning,
 * and more. 

However, the sharp eye can see that these use cases are not directed against the "normal user" of the application; they are directed at the developer/system manager. They are part of producing a meta-perspective from/on the app itself. 

## WhatIs: regulate (ii)? constrain input/output/function calls

In theory, the output function can produce any output it desires. However, in practice, the output function *almost always* produce *the same or almost the same output* as the input function do.

When the regulator *changes* the output/input from/to original function, this commonly means to *slightly* modify/restrict the values in particular ways. For example, a regulator might:
1. **restrict** `null` input arguments and turn all `null` input arguments into empty objects `{}` instead;
2. **reuse** as much as possible of previous output values returned from the same function so as to save memory (at the expense of computing) or to enable dirty-checking for similar values.
3. **memoize** (cache) output values for specific input arguments so as to avoid calling a function with the same arguments twice so as to reduce computing time (at the expense of memory).

## References

 * [Understanding Higher-Order Functions in JavaScript](https://blog.bitsrc.io/understanding-higher-order-functions-in-javascript-75461803bad)
 * [Eloquent JavaScript: Higher-Order Functions](https://eloquentjavascript.net/05_higher_order.html)
 * [What color is your function?](https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/)