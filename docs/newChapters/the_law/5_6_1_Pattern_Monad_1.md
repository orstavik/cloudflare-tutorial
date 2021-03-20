# Pattern: Monad I

In the previous chapter about dynamic variables, we scratched the surface of the problem of establishing dynamic variables. Today we solve this problem, today we monad.

In this description we are deliberately starting from JS terminology and JS coding practices.There are two reason for this: a) monad terminology is kinda weird, for example "return" means "create"; and b) the difference between monad/functional programming and JS/imperative/ObjectOriented descriptions often imply a distinction that neither exists, is necessary, nor good. Thus. Speaking about the monad pattern in JS with the words of JS makes it easier for us to see *why* and *how* the monad thing actually works.  

## The Monad life cycle

The monad is **an object**, and the monad lifecycle is:

1. **construct**. Monad `constructor` functions:
   1. uses its input to create a new state of objects/values, 
   2. wraps this state inside a monad object, and
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

Monads commonly have many constructors, converters, side-effect methods, and query methods.

## Monad `constructor`

Commonly, monads are described as being created by a plain `function`s, not `constructor`s. There are two reasons for this: 

1. The monad pattern is most common in functional programming and used in many programming languages that do not have `constructor`s. In this environment, the monad often replace the object/class patterns we know in JS.

2. The `constructor` pattern in JS is a bit flawed because JS doesn't allow method overloading. That means that if you have two very different ways to create a monad of the same type, then you would have to cram those into the same `constructor` function and do lots of argument type checking or adding arguments to identify which `constructor` scenario should be used. In JS this is solve by creating static factory functions on the `class` that can create different interfaces for the `constructor`.
   
However, the `class` and `constructor` (with `static` factory functions when needed) explicitly marks the *role* of the construct function and clearly identify which functionality will be needed by *every* object instance created. And this yields *three* benefits when using the `class` and `constructor` pattern to create monads in JS:

1. Readability. The JS developer more readily recognize the monad type and monad object as the `class` and `Object` that they are. The confusion that surround the mythical monads might very well be traced down to the misunderstanding that monads somehow are different from other regular objects and classes in ways that they are not (yes, monads and monad types are *more* than just an objects and classes, but they are still just regular objects and classes that can be created just fine by using `class` and `constructor` syntax).

2. Static tooling. `class` and `constructor` and `new` and other syntactic markers of role greatly assist static tooling and IDEs in assisting the developer. Code with monads benefit as much from this as any other code.

3. Performance. JS is a very dynamic language. It is not easy for the JS engine/interpreter to recognize which code will be reused when, what memory to be allocated, which function calls can be inlined, etc. By explicitly demarcating what `class`es exists in our code, we not only help static tooling and developers *read* our intent, but we also help the JS engine rrecognize it and then organize our code efficiently run-time.

In JS, I therefore have concluded that it is likely beneficial to present monad types as `class`es and create them via the `constructor` or `static` factory functions. What separates the monad and monad types from any other regular object and class types, is not the `class` and `constructor` syntax, but what comes next: the conversion methods. 

## Monad conversion methods

Monad conversion methods works in three steps:

1. create a new state using a) the state of the original monad, b) any input given to the conversion method, and c) the algorithm in the conversion method, then
2. wrap the new state inside a new monad object instance of the same type as the original monad (ie. an object with a different state, but with the same methods/functionality), and finally
3. return the new monad object with the new monad state.

Because the conversion method returns a monad of the same type as the original monad, such conversion methods can be **chained**. This is both very practical, and it looks good in the code using the monad. Here are two examples of how conversion methods are used, one with the native JS `Array` object and one with jQuery `$`:

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

What about the edge case when a monad end up reproducing the same state as the original monad? In such a circumstance, should the monad conversion method return the same instance (itself), or should it still create a new monad instance? 

The answer from current practice is clear: **always new instance**. For example, `[1,2,3].filter(n => n < 10)` will produce a new array instance with the same numbers `[1,2,3]`. jQuery do the same: if there are no `h2` elements in the DOM, then `$('h1').add('h2')` will produce a new jQuery instance that happen to wrap the same set of elements as `$("h1")` do/did. But why? Why do the convert methods always produce a new instance *in JS*? 

The primary reason is consistency. If a convert method sometimes returns a new monad instance and other times returns the same monad instance, then that is less consistent than when the same convert method will always return a new instance.

Consistency is also the second reason. If we decide to have monad convert methods return the same monad instance when it ends up with the same internal state as the original, then *all* monad convert methods should do so. And this is impractical. Some monad convert methods might fairly simply maintain a status that no change has occured. For example, it might be easy to detect that `$("h1").add("h2")` returns the same internal state when no `h2` elements are found in the DOM. However, it might be much more difficult to discover when `[0,1,2].map(n => Math.floor(Math.random()*3))` might happen to stumble upon the same state.

## Monad side-effect methods

*In use* monad side-effect methods look and feel very similar to monad conversion methods. Both side-effect and conversion methods return an instance of the same monad type, and therefore both side-effect and conversion methods can be *chained*. Here is what a side-effect sequence looks like in jQuery: `$("h1").hide().css("font-size", "12px").fadeIn().animate({color: "blue"}, 10)`. Here, an initial monad `$("h1")` is then passed through four side-effect methods `.hide()`, `.css()`, `.fadeIn()`, and `.animate()` that *mutate the underlying DOM elements*. And, finally, we can even zipper the different types together into one indistinct chain: `$("h1").hide().add("h2").css("font-size", "12px").fadeIn().closest("div").animate({color: "blue"}, 10)`. 

*Inside*, however, monad side-effect and monad conversions could not be more different: 
1. Conversion methods *always create a new state* and monad instance and return it; side-effect methods *always mirror* return the same monad instance (itself) without any changes.
2. Conversion methods *never mutate* any wrapped object or any other system component it can reach via its state; side-effect methods *always mutate* the wrapped objects or some other system component it can reach via the monad's inner state.

## Monad query methods

The query methods are plain, old JS methods, but with one restriction: *no mutations*. If you are making a monad, and you need to for example reduce the set of objects inside the monad and report out the result, you must either 1) create a temporary version of the reduced set that you discard later, or 2) split your task into a convert method and then a query method.

## Conclusion

It can often be good to apply the constraints of the monad when you create `class` and objects. Monad is a strategy to tackle immutability, and the voluntary restrictions of the monad pattern is a good guide when making safe, scalable, reusable `class`es and objects. 

## References

* 