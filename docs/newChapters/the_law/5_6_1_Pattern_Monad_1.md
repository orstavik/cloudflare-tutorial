# Pattern: Monad I

In the previous chapter about dynamic variables, we scratched the surface of the problem of establishing dynamic variables. Today we solve this problem, today we monad.

Here, we deliberate use JS terminology and JS coding practices, *not* established "monad terminology". There are two reason for this: 
1. Monad terminology is kinda weird when you are already neck deep in JS terminology. For example "return" means "constructor". 
2. When monad and JS terminology use different words about the same thing, this implies a distinction that neither exists, is necessary, nor good. 
   
So. We here will use JS words to explain the monad pattern. And we hope that will make it easier for us to see *what* a monad is, *why* we use them, and *how* they work.

## The Monad life cycle

A monad is **an object**, and a monad's lifecycle is:

1. **construct**. Monad `constructor` functions:
	1. use input to create a new state of objects/values,
	2. wrap this state inside a monad object instance, and
	3. returns the monad object.

2. **convert**. Monad convert methods:
	1. process the state of the monad in some way to produce a **new state instance** (without mutating the original state instance),
	2. wrap the new state instance in a **new monad instance** (with the same monad type as the original), and
	3. return the new monad instance.

3. **side-effect**. Monad side-effect methods:
	1. mutate external system components that it selects using the monad state, and
	2. return the monad object itself.

   Side-effects do *not* change the state of the monad itself: if the monad wraps a list of objects for example, a side-effect method will not create a new list of references, but it may very well mutate a value inside that list of objects.

4. **query**. Monad query methods:
	1. create a new value/object by combining a) the arguments, b) the state of the monad, and c) the algorithm of the query method, and
	2. return the value/object.

   A query method neither creates a new monad state, change the state of the monad, nor cause any side-effects.

Monads commonly have many constructors (factory methods), converters, side-effect methods, and query methods.

## Monad `constructor`

Commonly, monads are described as being created by a plain `function`s, not `constructor`s. There are three reasons for this:

1. The monad pattern is more common in functional programming and programming languages that do not have `constructor`s. In these environments, the monad often replace the object/class patterns we know from JS.

2. Many programmers don't like the `class`, `new`, `constructor`, `extends`, and `super` style of object orientation. And for good reasons. Classical inheritance (`super` and `extends` is bad), it serves no real purpose and only cause pain.

3. The `new` and `constructor` pattern in JS is a bit flawed:
   1. JS doesn't allow `constructor` overloading. This means you *must* have only *one* `constructor` per class. This doesn't really fit well with the class concept in general, nor monads in particular. What *can* happen is that you end up cramming *two or more different functions* into *one constructor*, which then *can* fill your `constructor` function with super fragile, god-awful argument type and value checking, extra arguments to identify which variant of the `constructor` that you intend to call, etc.
   2. Whenever you write `new` in your code, then the JS engine *must* create a new object. This is bad if you need to reuse objects from your own pool of objects. Put simply, you can't memoize nor reuse a `new` thing.
   3. However, there is a way out of this dilemma: `static` factory functions. You can have many factory functions (no need to cram many functions into one), and you can make the factory functions manage your pool of objects (it's fine to memoize and reuse static factory functions). `class`, `new`, `constructor`, and `static` factory functions is a viable OO pattern. 

The counter argument advocating for `class` and `constructor` syntax is that they explicitly marks the *role* of the `class` in particular and clearly identify which functionality will be needed by *every* object instance created. It is a step in the direction of making JS a more statically typed langauge. And this yields *three* benefits when using the `class` and `constructor` pattern to create monads:

1. Readability. Many JS developers more readily recognize the type vs instance dichotomy inherent in the monad pattern when they are presented as `class` and `constructor`. The confusion that surround the "mythical monads" in JS land might very well be traced down to the misunderstanding that monads are somehow different from other regular objects and classes in ways that they are not. (Yes, monads are *more* than just an objects and classes, but in JS they are still a subset of objects and classes that can be created just fine by using `constructor` and `class` syntax).

2. Static tooling. Syntactic markers such as `class`, `constructor`, `new`, etc. make it much easier for compilers, linters, IDEs auto completion, and other static tools to aid the developer. 
   
3. Performance. JS is a very dynamic language. This makes it hard for the JS engine/interpreter to recognize which code will be reused when, what memory to be allocated, which function calls can be inlined, etc. By explicitly calling a something a `class`, we help the JS engine recognize the unit of reuse and memory allocation more efficiently run-time.

My opinion is therefore that *as a first step* on the road to understanding the "monad pattern" in JS, it is best to use `class` and `constructor` (with `static` factory functions when needed). What separates the monad and monad types from any other regular object and class types, is not the `class` and `constructor` syntax, but what comes next: the convert methods.

> One might argue that this is 'mob rule': just because so many delevopers have been trained to think this way and so many tools have been made to look this way, that doesn't mean that it isn't still wrong to use `class` and `constructor`, and that we shouldn't still actively shun `class` and `constructor`. However. I think mob rule is a weak metaphor for such syntactic dilemmas. I think this problem is better understood as "grammaticalization": the slow progression of linguistic norms that evolve in *both* Darwinian and purely idiosyncratic ways. The process of grammaticalization *is already directed* by larger than life socio-historical, cultural, cognitive, and technical forces. The cognitive and technical dimension make language grammar seem as flexible as water; the cultural and socio-historical dimension make grammar seem as flexible as an ocean.

## Monad convert methods

Monad convert methods works in three steps:

1. create a new state using a) the state of the original monad, b) any input given to the convert method, and c) the algorithm in the convert method, then
2. wrap the new state inside a new monad object instance of the same type as the original monad (ie. an object with a different state, but with the same methods/functionality), and finally
3. return the new monad object with the new monad state.

Because the convert method returns a monad of the same type as the original monad, such convert methods can be **chained**. This is both very practical, and it looks good in the code using the monad. Here are two examples of how convert methods are used, one with the native JS `Array` object and one with jQuery `$`:

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

#### Always a new instance?

What about the edge case when a monad end up reproducing the same state as the original monad? In such a circumstance, should the monad convert method return the same instance (itself), or should it still create a new monad instance?

The answer from current practice is clear: **always new instance**. For example, `[1,2,3].filter(n => n < 10)` will produce a new array instance with the same numbers as the original array `[1,2,3]`. jQuery does the same: if there are no `h2` elements in the DOM, then `$('h1').add('h2')` will produce a new jQuery instance that happen to wrap the same set of elements as `$("h1")` did. But why? Why do the convert methods always produce a new instance *in JS*, even when no conversion is actually made?

The primary reason is consistency. If a convert method sometimes returns a new monad instance and other times returns the same monad instance, then that is less consistent than when the same convert method always returns a new instance.

Consistency is also the second reason. If we decide to have monad convert methods return the same monad instance when it ends up with the same internal state as the original, then *all* monad convert methods should do so. And this is impractical. Some monad convert methods might fairly simply maintain a status that no change has occured. For example, it might be easy to detect that `$("h1").add("h2")` returns the same internal state when no `h2` elements are found in the DOM. However, it might be much more difficult to discover when `[0,1,2].map(n => Math.floor(Math.random()*3))` might happen to stumble upon the same state.

## Monad side-effect methods

*In use* monad side-effect methods look and feel very similar to monad convert methods. Both side-effect and convert methods return an instance of the same monad type, and therefore both side-effect and convert methods can be *chained*. Here is what a side-effect sequence looks like in jQuery: `$("h1").hide().css("font-size", "12px").fadeIn().animate({color: "blue"}, 10)`. Here, an initial monad `$("h1")` is then passed through four side-effect methods `.hide()`, `.css()`, `.fadeIn()`, and `.animate()` that *mutate the underlying DOM elements*. And, finally, we can even zipper the different types together into one indistinct chain: `$("h1").hide().add("h2").css("font-size", "12px").fadeIn().closest("div").animate({color: "blue"}, 10)`.

*Inside*, however, monad side-effect and convert methods could not be more different:

1. convert methods *always create a new state* and monad instance and return it; side-effect methods *always mirror* return the same monad instance (itself) without any changes.
2. convert methods *never mutate* any wrapped object or any other system component it can reach via its state; side-effect methods *always mutate* the wrapped objects or some other system component it can reach via the monad's inner state.

But a question remains, how deep does the concept of state go in the monad? Why is `.add("h2")` a state change, while `.css("font-size", "12px")` is not? After all, the elements inside the two resulting jQuery objects have changed after both? A rule of thumb to distinguish side-effects from conversions are:
1. is it possible to have two category states active at the same time? In this system, *can* there be *two* such categories of state existing at the same time? For `.add("h2")`, the answer to that question is yes. It is not a problem for the JS engine to keep two lists of `HTMLElement`s connected to the DOM in its memory at the same time. However, for `.css("font-size", "12px")` the answer is no. Because the `$(..)` wraps `HTMLElement`s that are *connected to the DOM*, the JS engine cannot create two sets of these elements where *one* contains a different `style` property than the other.    

## Monad query methods

The query methods are plain, old JS methods, but with one restriction: *no mutations*. If you are making a monad, and you need to for example reduce the set of objects inside the monad and report out the result, you must either 1) create a temporary version of the reduced set that you discard later, or 2) split your task into a convert method and then a query method.

Now, it is possible to imagine a hybrid query+side-effect method: a method that both alter some state underlying the monad, and that also produce a value, for example something that says something about that state. However. This is not a preferred method. Why? Because side-effects should be clearly marked, and giving them their own method is beneficial. It is therefore strongly preferred to have two separate methods being called where the monad is used: first one with side-effects, and then one producing a value without any side-effects. However, if you *really, really* can't or need or want to combine side-effects and query into one, then the consequence is nothing other than your monad having a query method with hidden side-effects.

## Monad, just an object? Or, should objects just be monads?

I believe that the Monad pattern is best understood as a set of additional restrictions for `class` and object instances that *enforce **immutability** in a particular way*. I will not say that everything should be Monads, but if you feel like you *must* make a `class` for something, then it is *more than likely than not* that what you need is a monad.

Here is my rules of thumb for making monads in JS:
1. Make a `class` for the monad type.
2. **NO** `extends`: no classical inheritance.
3. You can create monad instances using the `constructor` and `new` in the beginning. But, before you export your monad as a library, you should wrap the `constructor` in `static` factory functions.
4. If one of the methods on your monad needs to make a state change, *and* the JS engine can hold *both* old and new state in memory at the same time, then that method should be a convert method. The convert methods *always* return `new` instances of the same monad `class`. Cf. `$("h1").add("h2")`.
5. If one of the methods on your monad makes a state change in the set of the monad, *but* the JS engine can **NOT** hold *both* the new and old state in memory at the same time, then this method should be a side-effect method. Side-effect methods should always return the same instance as it was called on. Cf. `$("h1").css("color", "blue")`. 
6. If your method a) do not make any state changes, and b) should return something other than a monad instance, then that is a query method. Query methods should strive to be pure getters or computers based on the established state, and avoid changing state as far as possible.   
7. Your monad object instances should have no other properties than convert methods, side-effect methods, and query methods. In addition to `constructor`s and `static` factory functions your monad `class` can have `static`, pure functions and `static` constants.
   * JS native `Array`s break this rule. The in place `.push()` and `.pop()` methods **mutate** the state of the `Array` object itself. Thus, while having monadic features and convert methods such as `.map()` and `.filter()`, `Array`s are not proper monads.

## References

* [Eric Elliot on OO, constructor, new, class, and extends](https://medium.com/javascript-scene/the-two-pillars-of-javascript-ee6f3281e7f3)
