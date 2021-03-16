# AntiPattern: SpaghettiFunctions

One way to create deep regulators is to **mutate scope variables referring to functions**. This pattern might seem simple, but it isn't. It is very hard to do correctly. This pattern might also seem innocent enough, but it isn't. Things can easily get out of hand (so please don't employ this pattern if you are making say an autonomous car or pacemaker). This is an antipattern.

## Demo: recursive spaghetti

In this demo we are going to regulate our `exponent` function **deeply**. With as few changes as possible from the previous version.

```javascript
(function () {                        //1
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

  function exponent(base, exp) {       //2
    console.log('exponent', base, exp);
    if (exp === 0)
      return 1;
    return base * exponent(base, exp - 1); //3
  }

  exponent = memoize(exponent);        //4 

  console.log(exponent(2, 4));         //5
  console.log(exponent(2, 4));         //
  console.log(exponent(2, 5));         //6
})();                                  //1
```

1. For clarity, we wrap our demo in a iife (Immediately Invoking Function Expression: `(function(){...})()`). The iife provides with a clearly defined local scope in which the two functions are declared and used.
2. `function exponent(base, exp){...` is essentially shorthand for `var exponent = function exponent(base, exp){...`.
3. When the original function named `exponent` is calling `exponent`, it is *not* calling the function instance object named `exponent`. What it is doing is getting the thing that the *variable* `exponent` is pointing too, which often just happens to be the same thing.
4. So, when `exponent = memoize(exponent)` is called, what happens is that *first* the value of `exponent` is retrieved. This happens to be the original function named `exponent`. Then, this function object is sent into the `memoize` function and reference to that function object is remembered as a closure variable for the regulator function. But then, inside the scope of the iife, the `exponent` variable is overwritten with the new regulator object. The variable remembering the `exponent` object is mutated. Now, anyone asking to get `exponent` will now get the new regulator function instance, and not the original function instance named `exponent`.
5. This means that when we now call `exponent`, we are
	1. getting the thing that the variable `exponent` in the iife points to, which now is the regulator function,
	2. the regulator has a referene to the original function named `exponent` from when it was created, and so it calls that function,
	3. the original function named `exponent` now is going to call `exponent`, the original function now asks the iife for the variable `exponent`, and the iife returns the updated value, the regulator function.
	4. And this means that when the original function named `exponent` "calls itself", it is no longer calling itself because the variable in the iife that used to point to it, the variable named `exponent` no longer points to it, but points to its regulator.
6. This means that all the recursive calls now gets channeled via the regulator first. And this means that we get deep behavior for our regulators. Which means that when we run line '6' we get a different scenario than previous.

```
deep (now)    | shallow (previous example)
--------------|--------------
memoize  2 5  | memoize  2 5 
exponent 2 5  | exponent 2 5 
memoize  2 4  | exponent 2 4 
              | exponent 2 3 
              | exponent 2 2 
              | exponent 2 1 
              | exponent 2 0 
```

If you are having trouble following the example/discussion above, try reading this little snippet and then try the code and discussion above again:

```javascript
var exponentVariable = function thisIsJustAName(base, exp) {
  if (exp === 0)
    return 1;
  return base * exponentVariable(base, exp - 1);
}

exponentVariable = memoize(exponentVariable);        
```

## Demo: nested spaghetti

The antipattern can just as easily be applied to nested function calls as recursive function calls.

```javascript
(function () {

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

  function theJungle() {
    return [goBananas(), goGorillas()]; //1x
  }

  goBananas = observe(goBananas);  //1a
  goGorillas = observe(goGorillas);//1b
  theJungle = observe(theJungle);    //1c

  console.log(goBananas());
  console.log(goGorillas());
  console.log(theJungle());         //2
})();
```

1. We mutate the local variables `goBananas`, `goGorillas`, and `theJungle` to point to the regulator functions, and not the original functions. This means that whenever we now fall the original function `theJungle()`, it will now get different function instances when it asks the iife for its `goBananas` and `goGorillas` variables on line `1x`.

2. So, when `theJungle()` is called, it calls the regulator function, which calls the original function named `theJungle`, which gets the iife's variables `goBananas` and `goGorillas` which now points to two regulator functions, and not the two original functions.

```
 deep (now) | shallow (before)
------------------------------
 theJungle  | theJungle     
 goBananas  |                
 goGorillas |                 
```

## Discussion

The descriptions of the demos above, simple as they are, illustrate how incredibly difficult it can be to see the difference between the function name and the variable name when you point to functions.

Because it can be so difficult to understand and keep track of functions as they change, mutating function references like this is commonly frowned upon. To mutate any variables like this is really bad, to mutate function variables like this is... evil? ugly? madness? polution?

If this doesn't convince you, this strategy is only accessible when you yourself control the function declaration. This strategy is only possible if the person writing the original function is the same as the person applying the regulator. This is often not the case, and this also makes it kinda pointless to make combinators and regulators in the first place.

## What to do then?

1. Always make variables holding `function` objects `const` (or treat them as if they were `const`, not `var`/`let`).

2. When you make regulator functions, make them `const` and give them a different name than the original functions.  

## References

* 