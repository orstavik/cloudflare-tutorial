# Pattern: Monad

In the previous chapter about dynamic variables, we scratched the surface of the problem of establishing dynamic variables. Today we solve this problem, today we monad.

The monad is **an object**, and the monad lifecycle is:

1. **Monad construction**. The monad is created as a wrapper around a set of other objects/values (its initial state). This is usually performed via a regular `function` call, but there is nothing inherently wrong by doing this as a `constructor`.
2. **Monad conversion**. A conversion method is a function called on the stateful monad. This function creates **a new instance** of the same monad type with a different state, and returns it.
3. **Monad side-effect**. A side-effect method a) does *not* change the state of the monad itself, but b) causes mutations on the state objects in the monad (or other type of side-effects via the state), and then return c) the monad object itself (the same instance).
4. **Monad query**. A query method returns a value from the stateful monad, often after a small operation.

Points 1 and 4 could be said about any type of objects. Nothing special here. Point 2 and 3, however, are special. Let's look a bit closer at them.

## Monad conversion methods

Monad conversion methods works in three steps:

1. create a new state using a) the state of the original monad, b) any input given to the conversion method, and c) the algorithm in the conversion method, then
2. wrap the new state inside a new monad object instance of the same type as the original monad (ie. an object with a different state, but with the same methods/functionality), and finally
3. return the new monad object with the new monad state.

Because the conversion method returns a monad of the same type as the original monad, such conversion methods can be **chained**. This is both very practical, and it can look good in the code using the monad. Here are two examples of how conversion methods are used, one with the native JS `Array` object and one with jQuery:

```javascript
//short, chained version
[1, 2, 3].filter(el => el % 2).map(el => el * 10);

//explanatory, verbose version 
const originalMonad = [1, 2, 3];
const convertedMonad = originalMonad.filter(el => el % 2);
const anotherMonad = convertedMonad.map(el => el * 1);
console.log(originalMonad !== convertedMonad, convertedMonad !== anotherMonad);

//short, chained version
$("h1").add("h2").closest("div");

//explanatory, verbose version 
const a = $("h1");
const b = a.add("h2");
const c = b.closest("div");
console.log(a !== b, b !== c, a !== c);
```

#### Always, always a new instance?

What about the edge case when a monad end up reproducing the same state as the original monad? In such a circumstance, should the monad conversion method return the same instance (itself), or should it still create a new monad instance? The answer is clear: a new instance. For example, `[1,2,3].filter(n => n < 10)` will produce an identical array `[1,2,3]` as it started with, but `.filter()` will still return a different array instance with the same numbers. We see the same behavior with jQuery: `$('h1').add('h2')` will produce a list of elements identical to that in `$("h1")` if there are no `h2` elements in the DOM. But why? 

First there is a practical reasons. When the conversion method starts, it doesn't know if it will end up with the same state. Some conversion method algorithms would discover a new state by either adding to or subtracting elements from the original state. Here, the extra effort to discover that *no addition or subtraction was made* would be small, and a choice could practically be made to return the same instance. However, some other conversion method algorithms make their state from the ground up. Such conversion methods would have to do a manual comparison of the two states at the end, every time, to find out if the two states are identical or not. That would be horrible complexity (twice the code) and bad for performance. Thus, the best way is to make all conversion methods return the same, new instance every time, even when no changes are made.

The second reason is principal. In principle, a monad instance can be likened to a frame, and a sequence of monad conversions can be likened to a stack. As with a stack, different branches can spawn up from any one frame. Now, there is nothing wrong with having a frame immediately resolve itself as the same frame as the original. However, there is nothing principally wrong with having a new instance for every conversion either. And so, a principal choice is that a void change is still a change is therefore a new instance principle reigns.  

The third reason is historical. Monad is a programming technique that is derived from category theory and used in programming long before JS was invented. Here, different technical and principled constraints applied, and here one conversion = new instance became the rule, and so this rule was transpiled to JS. todo fact check this.

## Monad side-effect methods

*In use* monad side-effect methods look and feel very similar to monad conversion methods. Both side-effect and conversion methods return an instance of the same monad type, and therefore both side-effect and conversion methods can be *chained*. Here is what a side-effect sequence looks like in jQuery: `$("h1").hide().css("font-size", "12px").fadeIn().animate({color: "blue"}, 10)`. Here, an initial monad `$("h1")` is then passed through four side-effect methods `.hide()`, `.css()`, `.fadeIn()`, and `.animate()` that *mutate the underlying DOM elements*. And, finally, we can even zipper the different types together into one indistinct chain: `$("h1").hide().add("h2").css("font-size", "12px").fadeIn().closest("div").animate({color: "blue"}, 10)`. 

*Inside*, however, monad side-effect and monad conversions could not be more different: 
1. Conversion methods *always create a new state* and monad instance and return it; side-effect methods *always mirror* return the same monad instance (itself) without any changes.
2. Conversion methods *never mutate* any wrapped object or any other system component it can reach via its state; side-effect methods *always mutate* the wrapped objects or some other system component it can reach via the monad's inner state.

## Monads and higher-order methods

Let's imagine that the conversion, side-effect, and query methods only accepted plain old data values. This is not a problem (yet). For example, if you wanted to convert your monad into a new monad by adding a number to all the numbers in your monad, then you would simply create a conversion method `.addToAll(number)` on your monad object, and then call it with a number. Then, if you wanted to subtract a nubmer from all, you make `subtractFromAll(number)`. Then `multiplyAllWith(number)`, `divideAllWith(number)`, etc. It works just fine, but there are suddenly lots of methods with overlapping boilerplate code. In fact, over time, your monad explodes with all the mathematical expressions imaginable.

Instead of all these `...All` methods, we could instead make *one* `.map(...)` method that iterates all the values in the state of the monad, and then performs a mathematical function on it. A function that we supply as an argument to the map function. Thus, instead of having *four* methods, we now have *one* that we can use in different ways in different contexts: `.map(add, number)`, `.map(subtract, number)`, `.map(multiply, number)`, and `.map(divide, number)`. This trick works for *both* conversion methods, side-effect methods, and query methods.

These higher-order methods mostly **iterate** over the state content in the monad and apply either a `function` or compare the state with another similarly structured state, and with a handful of functions such as `.map`, `.filter`, `.intersect`, `.assign()` and similar, the monad is quickly able to fulfill most of its use cases. Here people start tossing their hats in the air and celebrate! It is ok to drink champagne at this point. 
                                                                            
## Monad limitations

However, there are limitations with monads too. There are drawbacks. There are reasons why we don't always use them.

1. Monad conversions are split in two. Instead of simply formulating a `for` loop and then do our action inside that `for` loop, we must now 1) choose a higher-order method on the monad that will do the appropriate loop combination for us, 2) pass the action we desire into that method as an abstract function (where we must imagine which values the monad's higher-order function will pass as arguments to our abstract function). Regular imperative programming is also abstract, but monads are slightly more abstract.

2. The higher-order methods on the monad *controls* the flow of control of the conversion, side-effect, and query methods. This means that all the `if/else`, `for/while`, `try/catch` are declared inside the monads' methods. And thus, if we want to change/adapt these control structures we must add new methods to our monad. This doesn't happen as often as one might think: the generic `.map()`, `.filter()`, `.assign()` and `.reduce()` methods can cover a lot of ground. However, shortcomings in the monads generic control structures also happens more frequently than one might think: you don't have to use jQuery for long before you realize that a) you must/benefit from doing things outside jQuery, and b) do I really need jQuery in the first place? Isn't it just as well to do stuff with regular `for`-loops and my own `DOMNode` arrays?  



> The monad conversion functions look at the state of the monad object, and then calculate a new state. For example, lets say you have a monad wrapped around an array of numbers. This monad (object) has a function called `.half()` on it. This `.half()` function could for example make a new array and fill it with numbers half the value of the original monads array. Or, the `.half()` function could make a new monad with an array half the size of the original monad's array, for example the first half, the second half, or every other number. It is up to the monad and the monad conversion functions to decide *how* it should transform the state of the monad into a new state. When you make a monad, you can make all the specialized monad conversion functions you would like.



## Old draft...

## HowTo: make dynamic variables? part iii

How to fix the problem of the messy context variable being passed around everywhere? The main trick here is **by creating our own, custom *frame* object** that can **manage its own call stack**. This *special frame object* is the infamous **monad**.

```javascript
function middle(context) {
  return context.one;
}

function inner(context) {
  return context.two();
}

function makeContextObject(state) {
  const newContext = Object.assign({
    invoke: function (cb) {
      const state = (this.state || '') + cb(this);
      return makeContextObject(Object.assign({}, this, {state}));
    },
    unwrap: function () {
      return this.state;
    }
  }, state);
  newContext.invoke.bind(newContext);
  newContext.unwrap.bind(newContext);
  return newContext;
}

const start = makeContextObject({
  one: 'this really is ',
  two: () => 'something'
});

//const a = start.invoke(middle);
//const b = a.invoke(inner);
//console.log(b.unwrap());
console.log(start.invoke(middle).invoke(inner).unwrap());
```

What happened here?

1. We want the monad, the context object, to pass the dynamic variables into all the subsequent functions.
2. In order for that to happen, the context object then needs to be put in control of the *invocation* of the subsequent function. The context object gets an `invoke(..)` function (a function that takes another function as an argument).
3. This in turn causes a dramatic shift in style for our code: we must invoke the methods indirectly via the context/monad object. **Instead of passing objects as arguments into functions, we pass functions as arguments into objects.**
4. Each function that we want to be able to provide with dynamic variables, we must call individually with an `invoke(..)` function. This enables us to pass the dynamic variables as function arguments behind the scenes.
5. And, now that we call each function individually, we can't nest them anymore. So, we employ another nice looking strategy: chaining. And in order for us to be able to do that we must make the `invoke(..)` function return an instance of the context object itself (or a copy of that object). We choose to make a copy of that object, as that is a safer place to start.
6. And presto! JS jQuery-style. You now understand what a Monad is and most importantly **why** we use them (psst: "we use monads to get dynamic variables that are available in the same stack context").

## Monads and deep regulators

So, what does this have to do with combinators and regulators? The monad is a context that can hold not only values, but also functions (methods). If you want to replace calls to a function with calls to another function within one context, then a monad would be a good vehicle for such stack sensitive rebranding of functions.

The idea here is that:

1. You have a monad with a set of original functions.
2. Each time one of your functions gets invoked, the monad ensures that it is its current version of that function that gets called.
3. Thus, if you replace one of the monads functions with a regulator, then for subsequent calls within that monad instance the monad would use the regulator instead of the original function.
4. Presto: deep regulators.

## WhyWhyNot: Monads?

Some reeeeaaaaally like monads. Their argument is "monad everything, everything a monad"! There are also some very good arguments for using monads in JS: jQuery truly was/is beautiful in many ways.

But. Monads are not everywhere and everything. There are also times when monads are not that good.

1. The primary reason we don't monad everything is that we often don't see the context in which we are programming as a monad context. jQuery is working against the DOM as a context. As long as the DOM is the context, we can imagine all the functions on the jQuery object. But. This can be viewed as fixable.

2. We need to extend our custom monad objects with new functions when we need new forms of iterative logic or control structures. While it this then else that and loop a little forward and then backwards is simple in normal JS, it is not so simple with monads. We kinda need to commit when we are monad programming.

3. The monad offers a different flow of control. Inside the monad you are not free to specify neither loops nor if-else nor try-catch. The monad makes those decisions for you, and you must choose between a preset list of such control structures where you use the monad.

The monad is a context object. This context object is where we invoke functions. And so you invert the responsibilties (the object is deciding which arguments the function gets. The different invoke/bind functions describe when you call the passed in function and how you use the output from that function.

intertext 8:02 PM The monad decides iteration (how many times the function is called, and when), arguments for each call, and what to do with the output of each function. And what to return from the bind function (most often it should be an instance of the same object, so that calls can be chained, but it doesn't have to be).

## References

* 