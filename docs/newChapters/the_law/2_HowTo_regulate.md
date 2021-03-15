# HowTo: regulate?

The basic FunFunFun simply takes an original, input function and wraps it inside a regulator function. The purpose of the regulator can be many different things, but most common is to:

1. *observe* the time, sequence, and/or input/output, and/or
2. *adjust or adapt* the input, output, or invocations.

In JS pseudo-code, a FunFunFun that produce a regulator function from an input function, looks like this:

```javascript
function funFunFun(original) {
  return function regulator(...args) {
    //regulate input
    const originalResult = original(...args);
    //regulate output
    return originalResult;
  }
}
```

## Demo: `observeInputOutput`

In this demo we:

1. create a FunFunFun that makes a regulator that prints a) all the input `args` and b) the `output` each time the function is invoked.

2. We then replace the function we wish to observe with this regulator, and then we get a beautiful report each time the function is called.

3. We apply this to the problem of hypotenuse, because this is all the math I remember from school.

```javascript
function observeInputOutput(original) {
  return function regulator(...args) {
    console.log(original.name, 'input', args);
    const output = original(...args);
    console.log(original.name, 'output', output);
    return output;
  }
}

Math.pow = observeInputOutput(Math.pow);
Math.sqrt = observeInputOutput(Math.sqrt);

function hypotenuse(a, b) {
  return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
}

const five = hypotenuse(3, 4);
const moreThanTwo = hypotenuse(1, 2);
```

Prints this:

```
// const five = hypotenuse(3,4);
pow input [3, 2]
pow output 9
pow input [4, 2]
pow output 16
sqrt input [25]
sqrt output 5

// const moreThanTwo = hypotenuse(1, 2);
pow input [1, 2]
pow output 1
pow input [2, 2]
pow output 4
sqrt input [5]
sqrt output 2.23606797749979```
```

## WhatIs: `this`?

A pure function produces an output value based on input values and has no side effects. A pure function gets all its input data from its arguments, and therefore has no need for `this`. When you regulate pure original functions, you therefore need not worry about the `this`.

But. Sometimes you need to regulate *context* sensitive functions that use `this`. This is quite a bit more problematic, and I therefore strongly encourage you to try **plan a**: make your original function pure, instead of **plan b**: bind your regulator to a `this` context object.

Still. If plan B is forced upon you, or this kind of OO machismo is your thing, then here is *one* course of action (of many):

```javascript
function ellipsis(original) {
  return function regulator(...args) {
    const this2 = this.length <= 8 ? this : (this.substr(0, 5) + '...'); //2
    return original.call(this2, ...args);                                //3
  }
}

String.prototype.toLowerCase = ellipsis(String.prototype.toLowerCase); //1
"HELLO SUNSHINE".toLowerCase();
//hello...
```

Notice here that we:

1. associate the regulator function with the prototype,
2. make `this` a local variable `this2`, so that we
3. can pass the "regulated" `this2` into the `original` function via `.call(this2,...args)` as if it was just another input argument.

Att!! The above example is mostly intended as a deterrent. Even if you manage to grow tomatoes on Mercury, that doesn't make them automatically taste good. Even though there *might* be a two or three `this`-methods on a prototype that *can be* processed with the same regulator, that doesn't mean that it is better to do so than simply writing new prototype methods.

```javascript
//BAD use of regulators
function ellipsis(original) {
  return function regulator(...args) {
    const this2 = this.length <= 8 ? this : (this.substr(0, 5) + '...');
    return original.call(this2, ...args);
  }
}

String.prototype.toLowerCase = ellipsis(String.prototype.toLowerCase);
String.prototype.toUpperCase = ellipsis(String.prototype.toLowerCase);

//BETTER use repetition
(function () {
  const toLowerCaseOG = String.prototype.toLowerCase;
  String.prototype.toLowerCase = function () {
    const this2 = this.length <= 8 ? this : (this.substr(0, 5) + '...');
    return toLowerCaseOG.call(this2);
  }
  const toUpperCaseOG = String.prototype.toUpperCase;
  String.prototype.toUpperCase = function () {
    const this2 = this.length <= 8 ? this : (this.substr(0, 5) + '...');
    return toUpperCaseOG.call(this2);
  }
})();
```

* The code doesn't use `Object.definedProperty` for the sake of simplicity. Actually, I am not sure if we want `Object.defineProperty` in this instance

Conclusion: preserving `this` in regulators quickly becomes messy. It is not readable code. OO and regulators is not a good fit.

## WhatIs: in a `.name`?

Function names are useful in most use cases for regulators: debugging, logging, unit testing, machine learning, etc. Therefore, giving your regulators a good `.name` is therefore important. You want the `.name` of your regulator to mirror the `.name` of the original function, while at the same time add the ability to inspect which regulator functions has been applied to the original function.

There are two things to note here:

1. To change the `.name` of a `Function` object, you need `Object.defineProperty` (the simple `func.name = ...` doesn't work).
2. You can either mix in the trace of the regulator in the `.name` itself (for example splitting the name using a convention sign such as `_`), or by adding a reference to the regulators on the `Function` object itself.

```javascript
function observeInputOutput(original) {
  const regulator = function (...args) {
    console.log(original.name, 'input', args);
    const output = original(...args);
    console.log(original.name, 'output', output);
    return output;
  }
  Object.defineProperty(regulator, 'name', {value: original.name});
  regulator.regulators = regulator.regulators ? 
    [observeInputOutput, ...regulator.regulators] : 
    [observeInputOutput];
  return regulator;
}

Math.abs = observeInputOutput(Math.abs);
console.log(Math.abs.name); //abs 
console.log(Math.abs.regulators[0].name); //observeInputOutput 
```

## References

* [MDN: Function.name](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name)
* [simple tutorial on logging using higher order functions](https://levelup.gitconnected.com/higher-order-functions-in-javascript-566ed1d32db6)