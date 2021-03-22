# Problem: regulate recursion?

Thus far, we have illustrated the problems when we `memoize()` a) async functions b) that `throws` `Error` c) with a limited, LRU cache. Now, we are going to address yet another issue with combinators and regulators: recursion and depth.

## Demo 1: the problem of `memoize(exponent)`?

In this demo we first create a naive, simple function called `exponent`. `exponent` calculates "the power of" of a base number with an exponent using *recursion*: `exponent(2,4) === 16`. The `exp` is limited to positive integers as `exp` argument. 

```javascript
function exponent(base, exp) {
  if (exp === 0)
    return 1;
  return base * exponent(base, exp - 1);
}
```

Yes. You are right. We don't need such an `exponent` function in real life. In JS there is an operator for this `2**4 === 16` and a native function `Math.pow(2,4) === 16`. Still, we do this. Because we need a demo: a simple recursive function that everybody understands with the minimal effort.

Second, we want to `memoize(exponent)`. We make a naive, simple `memoize` function with no `Error` management, no LRU, no `async` support. We then apply this `memoize` function to our `exponent` function and create a new `memExponent` regulator function. The point of memoizing `exponent` is to replace repeated calls with already calculated answers from the cache.

```javascript
function memoize(original) {
  const cache = {};
  return function regulator(...args) {
    console.log('memoize', ...args);
    const key = JSON.stringify(args);
    if (key in cache)
      return cache[key];
    return cache[key] = original(...args);
  }
}

function exponent(base, exp) {
  console.log('exponent', base, exp);
  if (exp === 0)
    return 1;
  return base * exponent(base, exp - 1);
}

const memExponent = memoize(exponent);

console.log(memExponent(2, 4)); //1
console.log(memExponent(2, 4)); //2
console.log(memExponent(2, 5)); //3
```

1. The first time we call `memExponent(2,4)`, the `cache` is completely empty, and so we get the following action:

```
memoize 2 4    //no luck
exponent 2 4   //running exponent 
exponent 2 3   //recursively
exponent 2 2   //recursively
exponent 2 1   //recursively
exponent 2 0   //recursively
```   

2. The second time we call `memExponent(2,4)`, the `cache` has of course registered an entry for `args` `2, 4`. We therefore get a hit in the `cache` immediately, and the underlying, original `exponent` function is never called.

```
memoize 2 4    //yes, we have a hit in the cache 
```   

3. But, what happens when we call `memExponent(2,5)`? It is clear that there will be no hit in the cache for `args` `2 5`. But, will there be a hit in the cache for the first recursive call to `2 4`? Will the result be scenario A or scenario B below?

```
scenario A    | scenario B
---------------------------------
memoize  2 5  | memoize  2 5   
exponent 2 5  | exponent 2 5  
exponent 2 4  | memoize  2 4  
exponent 2 3  |
exponent 2 2  |
exponent 2 1  |
exponent 2 0  |
```   

The answer is: **scenario A**. The reason is that the recursive call to the function `exponent` inside the `exponent` itself is *not* the same reference as the new `memExponent`. So, when `exponent` function calls itself, it is the original function calling the original function directly.

## WhatIs: shallow vs. deep regulators?

The `memExponent` function above is a **shallow regulator**. Shallow regulators *only* apply to the outermost, initial function call of the regulator function instance: all function calls *inside* the original function is unaffected (and not routed through the regulator). This also applies to recursive functions: when the original `exponent` function calls itself, it is *not* calling the regulated version of itself, it is calling the original version of itself. 

A **deep regulator** on the other hand *also* wraps the regulator around function calls *inside* the original function. In such instances, the combinator not only *wraps* a function call inside another regulator function, but it more or less *infuses* the regulator to *all* or *a select few* inner function calls even inside the original function. We will soon discuss how we go about to make such a change, but first, we need to address yet another situation were *shallow* aspect of ordinary regulators become apparent: nested function calls.

## References

* 