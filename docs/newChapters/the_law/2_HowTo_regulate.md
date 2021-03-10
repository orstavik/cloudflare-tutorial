# HowTo: regulate?

The basic regulator simply takes an original, input function and wraps it inside a regulated function. 

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

## WhatIs: `this`?

> A pure function produces an output value based on input values and has no side effects. 

For pure functions there is no need to consider `this`. And, often, when discussing higher-order functions, people simply assume that everybody knows about pure functions and try to avoid impure functions as much as possible. The assumption is also that the developer themselves can handle the problems that arise when their functions are impure. This is also mostly true about this tutorial.

However, sometimes you do wish to regulate non-pure functions. And, when you do, you need to keep `this` in mind: The regulated function has a *different `this`* than the original.

1. The `this` of the regulated function is the regulator function object. This `this` is completely useless. When you want to associate particular properties for the regulator, you do so in the closure that the regulator function itself forms when called.
      
```javascript
function exaggerate(original) {
  const factor = 2;                       //YES!
  return function exaggerated(...args) {
    const originalResult = original(...args);
    return originalResult * factor;       //YES!
    // return originalResult this.factor; //no...
  }
}
// regulatorFunction.factor = 2;          //no...
Math.abs = exagerrate(Math.abs);
Math.abs(-2);    // => 4
```

2. The `this` of the original function might however be very relevant. And very hard to reach *after* the regulated function has been created. If you need to provide the inner original function with different `this` context along the way, then there are two ways to do so:

   * pass the `this` context of the original function as an argument to the regulated function, or

```javascript
function expressiveString(smiley, original) {
  return function express(context, ...args) {
    const originalResult = original.call(context, ...args);
    return originalResult + smiley;
  }
}
const hedge = expressiveString(" :)", String.prototype.toLowerCase);
hedge("WHAT DID YOU SAY?");    // => what did you say? :) 
```
     
   * add the regulated function to the prototype (this is most likely what you want).

```javascript
function expressiveString(smiley, original) {
   return function express(context, ...args) {
      const originalResult = original.call(this, ...args);
      return originalResult + smiley;
   }
}
String.prototype.shout = expressiveString("!!!", String.prototype.toUpperCase);
"what did you say?".shout();    // => "WHAT DID YOU SAY?!!!" 
```

As you can see, preserving `this` quickly becomes messy. It is not readable code. ObjectOrientation and higher-order functions don't really mix very well. 

## WhatIs: in a `.name`?

The `.name` of a function is useful when you want to observe that function during debugging, logging. A prime use case for regulator functions is to observe during debugging and logging, and so you often wish to make the `name` of the regulated output function to resemble the `.name` of the original input function. To do this, you need `Object.defineProperty` (the simple `func.name = ...` doesn't work):

```javascript
function exaggerate(original) {
  const factor = 2;
  const regulated = function(...args) {
    return original(...args) * factor;
  };
   //todo we should probably assign the regulator spec as a list on the function. and just use the original.name as the name.
   // Object.defineProperty(regulator, 'name', {value: original.name});
   // regulator.regulators = [stateManager, ...(original.regulators || [])];
   // regulator.regulators = ['sm', ...(original.regulators || [])]; //this is not the best, i think just adding the function is better
   Object.defineProperty(regulated, 'name', {value: '_exaggerated_' + original.name});
  return regulated;
}
Math.abs = exaggerate(Math.abs);
console.log(Math.abs(-2));    // => 4
console.log(Math.abs.name); // _exagurated_abs 
```

## References

 * 