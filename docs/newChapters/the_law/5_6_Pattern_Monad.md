# Pattern: Monad

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

## References

* 