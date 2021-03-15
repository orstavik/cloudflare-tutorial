# Problem: function arguments

## Deep vs. shallow regulators

In the previous chapters, we have implicitly discussed deep vs shallow combinators.

A shallow combinator adds a regulator *only* to the outermost initial function call of an original function instance. Once original function is called, and the flow of control passes into the original function, there is no trace of the regulator inside the original function. The regulator is just a shallow wrapper around the outermost function call of the original function.

A deep combinator *infuses* regulators not only on the outermost initial function call, but also function calls *inside* the original function.

## Strategies for making deep combinators

The previous chapter described how we can mutate function references inside original functions to achieve *deep* regulators. In this chapter we will describe a different strategy that we call function arguments.

Instead of *only* applying a regulator to a function, we could apply the *same* regulator to *both* a function, *and* all the arguments to that function. Now, that wouldn't make any sense if those arguments were only static values. However, that do make sense if those arguments are also functions, both recursive functions such as `exponent` or other similar functions such as `goBananas` and `goGorillas`.

This the dark-side of programming;) This is the bridge from JS to functional programming. The purpose of this article is not to do functional programming in JS, but to illustrate this bridge: *what* must we do if we want to apply a combinator to a recursive function (a functions inside our original function), *without* making a spaghetti of mutated function references?

## functions as arguments to the function as argument

In this example we will illustrate how we can `memoize(exponent)` *without* mutating a variable name that we thought were fixed, but that turned out to mutable when we got a little bit dirty with our naming. Here, we need to make changes both to our `memoize` and `exponent` function for this to happen.

```javascript
  function memoize(original) {
  const cache = {};
  return function regulator(...args) {
    const key = JSON.stringify(args);
    if (key in cache)
      return cache[key];
    return cache[key] = original(...args);
  }
}

function exponentOriginal(exponentFunction, base, exp) {
  if (exp === 0)
    return 1;
  return base * exponentFunction(exponentFunction, base, exp - 1);
}

const memExponent = memoize(exponentOriginal);
console.log(memExponent(memExponent, 2, 4));
console.log(memExponent(memExponent, 2, 5));
```

We can also do the same with `doJungle`:

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

function goJungle(goBananas, goGorillas) {
  return [goBananas(), goGorillas()];
}

const observedBananas = observe(goBananas);
const observedGorillas = observe(goGorillas);
const observedJungle = observe(goJungle);

console.log(observedBananas());
console.log(observedGorillas());
console.log(observedJungle(observedBananas, observedGorillas));
```

## y combinator = recursive regulator automata?

We *can* write a general function for applying a combinator/regulator to all inner functions, as long as those functions are *listed as arguments*. When we go down this path, we end up somewhere around the (in)famous y combinator. Now, the y combinator is often presented as if it doesn't the recursive functions as arguments. That is not really true. It is just that if a function is being called with the function object itself as the first argument, then we can just use the function object we are going to wrap twice, both as the function to be called, and the function to be wrapped as an argument. So, in the case of `exponent`, we could *hide* that we pass `exponent` as an argument function to the `exponent` function, but in the case of `goJungle`, we can *never* get around the fact that we need to pass in `goGorillas` and `goBananas` explicitly if we are to recursively apply the combinator *deeply* to them too. Put another way, the Y combinator and derivative automata that we can make to automate the application of a combinator recursively will only work on functions that are explicitly passed as arguments (plus the special case of recursive functions where the function that is being passed is the same as the function calling that function).

That was a long cognitive rant. About recursive application of combinator on functions inside functions inside functions. I think that the point of this rant is as follows:
1. It is possible to create a small machine (y combinator) that given some transformation of functions can apply a combinator not only to the topmost, shallow function invocation, but also to the inner invocation of functions that are passed as arguments (including the function itself).
2. That is an intriguing puzzle for the human mind. It is like a rubrics cube that begs to be solved and understood.
3. They say that solving this puzzle was a very important step forward for computer science. And I can neither verify that nor say that I care too much about it.
4. However, the fact that we can automate **deep combinators**, so that we can write functions that can be deeply regulated (with only minor adjustments in coding style), doesn't mean that we should. **Deep combinators** *might* be very useful in order to create purer functional programming languages, and that it *might* yield a very nice experience writing code in those languages. But, that *still* hasn't proven that *deep regulation of functions* is neither better nor worse than *shallow regulation of functions*.

## WhyNot: Shallow regulators?

I will make the arguments that:
1. although it is possible to make *deep combinators* in Javascript,
2. although the *deep combinators* can be stylistically *not that different* from normal JS functions,
3. that it is *stylistically different enough* to be undesirably to do so,
4. that *shallow combinators* supports the important use cases that we need,
5. that *shallow combinators* are systematically efficient in javascript, while deep combinators are not, and
6. that *shallow combinators* are conceptually a better model, not because of their principled simplicity, but because of their practical simplicity.

1) Deep combinators can be understood to apply to *both* recursive functions and nested functions: if you want to apply a regulator to `goBananas` and `goGorillas` when you apply that regulator to `goJungle`, that is a valid use case; if you want to apply a regulator to all recursive calls from within the same original function, that is valid. This is possible.

2) with enough makeup/helper functions that support this invocation, this can be achieved in a generalized manner and return functions that look more or less like normal javascript functions, and you can write functions that support such implementation without too many stylistic changes.

3) But. You have to make a few stylistic changes. You cannot just take any function out of a Javascript library and pass them into such a *deep combinator* automata. The inner function references that are to be processed deeply *must be* passed in from the very top. Bummer.

4) Luckily. Shallow combinators is almost always sufficient from a JS point of view. In JS we have lots of other mechanism at our disposal. We can change prototypes' functions, we can loop, we have variables, create classes, etc. So while purer functional programming languages misses those features, and therefore need stronger and deeper combinators, JS can very well live without.

   Furthermore, applying a combinator recursively can lead to different problems. It is far from certain that you wish to for example `memoize` the intermediate results of `exponent`. Maybe you are only going to ask to exponents in the range of 10-15. Why then cache the results from 0-9?

5) Shallow combinators are efficient. They wrap their original function in a way that can be sped up run-time to a negligible difference in run time. If you apply a regulator to 100 nested inner function calls, recursive or not, that is 100 times more costly than only applying the regulator to the outermost call.

6) I will argue that you should view combinators as a strategy to create meta-perspectives on your code. Combinators are great at making a data view of your application. But, these "rapports" need to be pruned manually. You cannot simply dump out the entire stack of the machine. You must *choose the level* from where you want to write your rapport. In practice, this means that you need to choose the function that has the overview of the situation you need to monitor, and then run your combinators on function calls within that function, on the level of that function, and *only* on the level of that function.

   The **shallowness** of shallow combinators is not their weakness, it is their strength. A combinator doesn't alter function calls in the stack *before* they are applied. By keeping them shallow, combinators can also *limit* their modification of function calls till the scope of the function reference. And that is powerful.
   
   This enables *shallow combinators* to *both* restrict their perspective downwards by making local variants of functions and only monitor them locally, and to make local variants of functions that are then hoisted up in scope and used by a wider context from there or sent into other functions directly and used there. In either case, **shallowness** is mostly a matter of control in JS, as JS provide many different and better means to make a function for example universally accessible.

   The only thing that *shallow combinators* lack is the ability to make something universally accessible in the stack. But this feature is restricted in JS. There are no dynamic variables neither, and it is good how `const` and `let` reduces the dynamic features of `var`. JS works with semantic scope, and *shallow combinators* is a better fit. Make your combinators in a shallow context, and then distribute your regulator functions semantically if you wish. Not Y combinator in JS, but why not shallow combinators in JS? 

## References

* 