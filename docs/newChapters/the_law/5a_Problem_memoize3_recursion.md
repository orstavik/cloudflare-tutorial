# Problem: regulate recursion?

In this article we will discuss a limitation with the combinators and regulators described thus far: recursion.

## Demo 1: the problem of `memoize(exponent)`?

In this demo we illustrate the problem of recursion in the simplest way possible:
1. We create a recursive function `exponent` which is simply an exponential function for positive integers,
2. We make a memoized version `memExponent` from `exponent`. The memoize is super naive: no `Error` management, no LRU, no `async`.  

```javascript
function memoize(original){
  const cache = {};
  return function regulator(...args) {
    const key = JSON.stringify(args);
    console.log('memoize', ...args);
    if(key in cache) 
      return cache[key];
    return cache[key] = original(...args); 
  }
}

function exponent(base, exp){
  console.log('exponent', base, exp);
  if(exp === 0)
    return 1;
  return base * exponent(base, exp-1);
}

const memExponent = memoize(exponent);

console.log(memExponent(2,4)); //1
console.log(memExponent(2,4)); //2
console.log(memExponent(2,5)); //3
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

3. But, what happens when we call `memExponent(2,5)`? It is clear that there will be no hit in the cache for `args` `2 5`. But. Will there be a hit in the cache for the first recursive call to `2 4`?
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


## References

* 