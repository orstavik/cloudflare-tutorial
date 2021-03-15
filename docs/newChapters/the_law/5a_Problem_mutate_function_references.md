# Problem: mutate function references

In this article we discuss the possibility of regulating functions in the same scope as the function themselves are declared, and the pitfalls of such an approach.

## Spaghetti solution: `exponent` everything

```javascript
function memoize(original) {
  const cache = {};
  return function regulator(...args) {
    const key = JSON.stringify(args);
    console.log('memoize', ...args);
    if (key in cache)
      return cache[key];
    return cache[key] = original(...args);
  }
}

let exponent = function (base, exp) { //1
  console.log('exponent', base, exp);
  if (exp === 0)
    return 1;
  return base * exponent(base, exp - 1);
}

exponent = memoize(exponent);        //2 

console.log(exponent(2, 4));         //3
console.log(exponent(2, 5));         //4
```

1. To more clearly illustrate what is going on, we illustrate that the `exponent` function is a variable in the scope of the demo.
2. When we make a `memoize`d version of original `exponent` function, we now assign this new function object to the same variable `exponent`. Before we call `memoize`, the `exponent` variable points to the original function object, and so it is a pointer to this object that is set up inside the memoize closure. However, when the `memoize` function returns, it changes the object which `exponent` points to.
3. This means that when `exponent` function calls itself, it is not really calling itself. It is calling the function that is called `exponent` in the local scope of the demo, and this is no longer the original function, but the new `memoize`d regulator function around the original function. This means that every time the original function now calls `exponent`, it is calling the wrapper, regulator function. Thus, *after* `exponent(2, 4)` is finished the `cache` is filled with entries for all the recursive calls: `{ '[2,4]': 16, '[2,3]': 8, '[2,2]': 4, '[2,1]': 2, '[2,0]': 1}`.
4. Furthermore, this same logic now applies when `exponent(2, 5)` is called. This time, the first time the original `exponent` function is called, it will also come up empty from the `cache`, but instead of the original function *only* calling itself, the original function will now look up "what does the `exponent` variable in the above scope now points to?", and that will be the regulator function object. Thus. The first time the `exponent` goes recursive and call `exponent(2, 5-1)` => `exponent(2, 4)`, it will go into the regulator   which will retrieve a `cache` hit.

## Spaghetti solution: help, it's a `jungle`

```javascript
function observe(original) {
  return function regulator(...args) {
    console.log(original.name);
    return original(...args);
  };
}

function goBananas() {
  return "bananas";
}

function goGorillas() {
  return "gorillas";
}

function goJungle() {
  return [goBananas(), goGorillas()]; //1x
}

goBananas = observe(goBananas);  //1a
goGorillas = observe(goGorillas);//1b
goJungle = observe(goJungle);    //1c

console.log(goBananas()); 
console.log(goGorillas());
console.log(goJungle());         //2
```

1. Here, we do the same thing as in the example above: we mutate the value of the variables `goBananas`, `goGorillas`, and `goJungle`. The consequence is here that line `1a` and `1b` alter the objects that are referenced in line `1x`.

2. When `goJungle()` is called, this would of course lead to the regulator-version of the `goJungle` function being called. This goJungle-regulator then calls the goJungle-original function. But. When the goJungle-original now looks up `goBananas` and `goGorillas` on line `1x` from the local scope, then these are new function objects that were declared on line `1a` and `1b`. Thus, when the regulated `goJungle()` now is called, it will call original-goJungle function that now will call the ***regulated***-goBananas and ***regulated***-goGorillas functions.

## Discussion: pasta isn't healthy eating

1. This might be what you are looking for.
2. This might look like it is doing what you want.
3. This applies memoization to all instances of a method.

But. This is a seriously flawed strategy! I **strongly** recommend against using it. Why?

1. As can be gleamed from the descriptions of the demos, even for simple examples like this, it is incredibly difficult to see the management of pointers. They mutate. It is **not** good to have mutating references to functions inside functions themselves.
2. This is only possible *when* you have access to the scope of the function declaration, which you almost never have in real life. As soon as you for example `import` `exponent` or `goJungle` from either a JS module or just from another scope/function/block, you can no longer mutate the references inside the function.

Thus. Don't use this approach. It is a problem, not a solution. 

## References

* 