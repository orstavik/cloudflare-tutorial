# Pattern: GlobalUpdate

One way to fix the problem with SpaghettiFunctions is to change the way we make recursive and nested calls in our library functions. If we explicitly make sure that nested calls and recursive calls in a library is pointing to the global, top-most reference, then when we change that reference, the internal calls in our original functions will follow suit.

## Demo: `memoize(MyMath.exponent)`

In this demo we are going to `memoize` a function and use it via a global registry: `window.MyMath.exponent`. `exponent` is a function we define ourselves. We do so in a `MyMath` object, and then we register `MyMath` as a global namespace on the `window` object.

```javascript
(function () {
  const MyMath = {};
  MyMath.exponent = function whatsInAName(base, exp) {
    console.log("exp", base, exp);
    if (exp === 0)
      return 1;
    return base * MyMath.exponent(base, exp - 1);
  }
  window.MyMath = MyMath;
})();

(function () {
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

  MyMath.exponent = memoize(MyMath.exponent);

  console.log(MyMath.exponent(2, 4));
  console.log(MyMath.exponent(2, 4));
  console.log(MyMath.exponent(2, 5));
})();                                  
```

## Demo: `observe(MyMath.hypotenuse)`

In this demo we are going to `observe` a group of functions in a library that call each other.

```javascript
(function () {
  const MyMath = {};
  MyMath.exponent = function _expo(base, exp) {
    if (exp === 0)
      return 1;
    return MyMath.multiply(base, MyMath.exponent(base, exp - 1));
  }
  MyMath.sum = function _sum(a, b) {
    return a + b;
  }
  MyMath.multiply = function _multi(a, b) {
    return a * b;
  }
  MyMath.sqrt = function _sqrt(a) {
    return Math.sqrt(a); //cheating a little
  }
  MyMath.hypotenuse = function _hypo(a, b) {
    return MyMath.sqrt(MyMath.sum(MyMath.exponent(a, 2), MyMath.exponent(b, 2)));
  }
  window.MyMath = MyMath;
})();

(function () {
  function observe(original) {
    return function regulator(...args) {
      console.log(original.name, ...args);
      return original(...args);
    }
  }

  MyMath.exponent = observe(MyMath.exponent);
  MyMath.sum = observe(MyMath.sum);
  MyMath.multiply = observe(MyMath.multiply);
  MyMath.sqrt = observe(MyMath.sqrt);
  MyMath.hypotenuse = observe(MyMath.hypotenuse);

  console.log(MyMath.exponent(5, 3));
  console.log(MyMath.hypotenuse(3, 4));
})();                                  
```

prints:
```
_expo 5 3
_expo 5 2
_expo 5 1
_expo 5 0
_multi 5 1
_multi 5 5
_multi 5 25
125
_hypo 3 4
_expo 3 2
_expo 3 1
_expo 3 0
_multi 3 1
_multi 3 3
_expo 4 2
_expo 4 1
_expo 4 0
_multi 4 1
_multi 4 4
_sum 9 16
_sqrt 25
5
```

## Problem: deep regulators in existing libraries

The problem with this approach is that the library that you are going to apply combinators too, must use functions via a global property. Expect that establish libaries don't do this. You can see the problem when we apply the same concept to the builtin `Math` library.

```javascript
(function () {
  function observe(original) {
    return function regulator(...args) {
      console.log(original.name, ...args);
      return original(...args);
    }
  }

  Math.pow = observe(Math.pow);
  // Math.sum = observe(Math.sum);          //don't exist
  // Math.multiply = observe(Math.multiply);//don't exist
  Math.sqrt = observe(Math.sqrt);
  Math.hypot = observe(Math.hypot);

  console.log(Math.pow(5, 3));
  console.log(Math.hypot(3, 4));
})();                                  
```

prints:
```
pow 5 3
125
hypot 3 4
5
```

## References

* 