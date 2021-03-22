# Pattern: BirdY

We have established that we can't mutate our way to deep regulators. Is there another way we can do it that is not evil nor ugly nor dangerous?

## Functions as arguments

Instead of mutating variable function references, we can pass the functions in as arguments instead. This enables us to specify clearly which function instances are being used inside a function. This also gives us a clear path to replace one set of function instances *inside* an original function with a different set of function instances when we call the original function.

For the recursive `exponent` function, the function would look like this:

```javascript
var exponent = function whatsInAName(fun, base, exp) {
  if (exp === 0)
    return 1;
  return base * fun(base, exp - 1);
}

console.log(exponent(exponent, 2, 4)); //16
```

For the nested jungle, gorillas, and bananas example, the function looks like this:

```javascript
var goBananas = function whatsInAName1() {
  return 'babanas';
}
var goGorillas = function whatsInAName2() {
  return 'gorillas';
}
var theJungle = function whatsInAName3(fun1, fun2, sometimes) {
  if (sometimes)
    return [fun1()];
  return [fun1(), fun2()];
}

console.log(theJungle(goBananas, goGorillas, false)); //["bananas"]
```

## WhatTheHell: happened here?

If the code above looked a little greek to you, don't be too freaked out. It is only *one* thing that is really different from normal Javascript code: **the passing of functions as arguments**. If you approach this piece of code from a "normal" Javascript mindset, then just think of the functions in the argument list as explicit dependencies, as a list of "imports" for the function: if you are going to use another function inside a function, then you should add use that inside function as if it was passed to you as an argument.

> I would like to note, in advance, that I find this approach... not pretty and not appropriate in the domain of Javascript. The code isn't outright ugly, but I don't prefer it. I will try my best to illustrate why in the coming discussion.

But, passing inner functions as arguments is only the first step. The next step is to integrate this strategy with combinator.

## Demo: recursive memoize with function arguments

Here is a demo of the `memoize(exponent)` function implemented using functions as arguments:

```javascript
function memoize(original) {
  const cache = {};
  const regulator = function (...args) {               //2
    const key = JSON.stringify(args);
    if (key in cache)
      return cache[key];
    return cache[key] = original(regulator, ...args); //2
  };
  return regulator;
}

const exponent = function whatsInAName(fun, base, exp) {//1
  if (exp === 0)
    return 1;
  return base * fun(base, exp - 1);
}

var exponentY = memoize(exponent);

console.log(exponentY(2, 4)); //16
console.log(exponentY(2, 5)); //32, retrieving 16 from cache
```

Important to note in this demo is:

1. The original function must be declared with the inner function to be called passed in as an argument. If the original `exponent` was declared using a variable to carry the function reference, then that simply could never be deeply regulated using some kind of Y approach.

2. The output regulator function can pretend not to have any function argument dependencies. The combinator can automatically add its regulator as the callback inside the original function.

## Pattern: BirdY

But, what if we wanted to employ *two* combinators (i.e. `memoize` and `observe`) on the same original `exponent` function? Could we do that? Yes. The only thing we need to keep in mind is that the regulators must also pass in themselves as their argument, and then we must have an outermost regulator to pass in the function itself as its first argument.

This is the BirdY pattern, which enables us to make deep regulators (cf. the WhyBird and Y-combinator pattern). The BirdY pattern works best with recursive functions that are declared with a reference to themselves as their first argument. 

```javascript
function memoize(original) {
  const cache = {};
  return function (regulator, ...args) {               //2
    const key = JSON.stringify(args);
    if (key in cache)
      return cache[key];
    return cache[key] = original(regulator, ...args); //2
  };
}

function observe(original) {
  return function (regulator, ...args) {               //2
    console.log(original.name, args);
    return original(regulator, ...args); //2
  };
}

function addSelfAsFirstArgument(original) {
  const regulator = function (...args) {
    return original(regulator, ...args);
  }
  return regulator;
}

const exponent = function whatsInAName(fun, base, exp) {//1
  if (exp === 0)
    return 1;
  return base * fun(base, exp - 1);
}

const exponentY = addSelfAsFirstArgument(memoize(observe(exponent)));
console.log(exponentY(2, 4)); //16
console.log(exponentY(2, 5)); //32, retrieving 16 from cache
```

> This demo is intentionally *not* written in arrow functions. For me, it is easier to understand how function instances are passed from the outside in and around, when the loop is described using plain-old `function` notation.

## References

* 