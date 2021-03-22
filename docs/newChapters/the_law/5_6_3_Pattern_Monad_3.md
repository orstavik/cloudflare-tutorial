# Discussion: monads and dynamic variables

The monad is a "frame" of values. And with higher-order methods, we can call functions that will be fed with the values of that frame. So, monads can be used to create a stack that can automatically pass dynamic variables into subsequent methods (that are invoked using the monad convert methods).

## Demo: a function in a function

We start with a dead simple program.

```javascript
function inner(i) {
  return i * 20;
}

function outer(o) {
  return o + inner(2);
}

console.log(outer(2)); //42
```

## Problem: observe and remember

We want to add two dimensions to our dead simple app:

1. Observe when both the outer and inner functions are called.
2. Establish a state that will apply to several subsequent calls.

We *can* hard-code this using a flat combinator and variables:

```javascript
let i;

function inner() {
  return i * 20;
}

function outer(o) {
  return o + inner();
}

function observeInvocation(original) {
  return function (...args) {
    const res = original(...args);
    console.log(original.name, "result:", res, "args:", args);
    return res;
  }
}

inner = observeInvocation(inner);
outer = observeInvocation(outer);

i = 2;
console.log(outer(2));
//inner result: 40 args:  
//outer result: 42 args: 2 
//42

i = 0;
console.log(outer(3));
//inner result: 0 args: 
//outer result: 3 args: 3 
//3
```

But this is really bad. It doesn't scale. So, lets see how it goes with monads:

## Solution: monad with function and value states

With monads, we need to chain instead of nest our functions. This means that we first call `inner()`, then `outer()`. We then make our monad use a wrapper function as part of the logic of the convert method(s).

```javascript
class StateAndFunctionMonad {

  constructor(wrapper, value = 0) {
    this.wrapper = wrapper;
    this.value = value;
  }

  convert(original, ...args) {
    const value = this.wrapper ? this.wrapper(original, args) : original(...args);
    return new StateAndFunctionMonad(value, this.wrapper);
  }

  value() {
    return this.value;
  }
}

function inner(a) {
  return a * 20;
}

function outer(a, b) {
  return a + b;
}

function wrapper(original, args) {
  const res = original(...args);
  console.log(original.name, args, res);
  return res;
}

const start = new StateAndFunctionMonad(wrapper, 2);
start.invoke(inner).invoke(outer, 2);
//inner [2] 40 
//outer [40, 2] 42 
//42

const start2 = new StateAndFunctionMonad(wrapper, 0);
start2.invoke(inner).invoke(outer, 3);
//inner [0] 0 
//outer [0, 3] 3 
//3
```

This example shows (poorly) how a monad can hold both regulator functions and state values that can be applied progressively to subsequent calls in the stack as dynamic variables. Todo improve the example, make a simple use case that people believe in!

## Drawback of monads

1. is that they can only see abstract functions that are passed to the monad. If you nest, you are going outside of the scope of the stack that the monad models. 

2. control structures require more boilerplate with monads. If you need an if-else, then you are best off writing a custom convert method for that.   

> The monad is a context object. This context object is where we invoke functions. And so you invert the responsibilties (the object is deciding which arguments the function gets. The different invoke/bind functions describe when you call the passed in function and how you use the output from that function.

> The monad decides iteration (how many times the function is called, and when), arguments for each call, and what to do with the output of each function. And what to return from the bind function (most often it should be an instance of the same object, so that calls can be chained, but it doesn't have to be).

## References

*
