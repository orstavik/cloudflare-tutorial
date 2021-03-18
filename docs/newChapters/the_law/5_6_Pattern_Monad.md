# Pattern: Monad

## WhatIs: dynamic variables?

How does JS resolve variables? What is a JS variable? And what is *not* a JS variable? Big questions, answered quickly.

### 1. JS names are frame variables.

When JS tries to find out what a name in a function points to, it will *first* look inside the context of the current function to see if there are any variables declared with that name. JS is *first* interpreted in the context of ***current frame***, and the current frame is one layer in the stack. A name in JS is therefore *primarily* a reference to something within the frame which in turn is something within the stack.

There are several rules for how JS resolves variable names **within** the current frame. These rules are associated with the layout of blocks `.. { .. } ..` within the current function within. It is common to think that a) variable names can be passed *down* these blocks, not up, and that b) variable names must be declared *before* they are accessed. This is good practice, and for `let` and `const` this is also true. However, `var` don't follow these rules, `var` is kinda all over the place, and so `var` names can both be hoisted and flow upwards [6000 stars(!)](https://stackoverflow.com/questions/762011/whats-the-difference-between-using-let-and-var).

```javascript
(function () {
  console.log(bob);    //undefined
  if (true) {
    if (true) {
      var bob = 'is your uncle';
    }
  }
  console.log(bob);    //bob
})();
```

while

```javascript
(function () {
  // console.log(bob);  //would be a ReferenceError
  if (true) {
    if (true) {
      let bob = 'is your uncle';
    }
  }
  console.log(bob);    //ReferenceError
})();
```

### 2. names are global variables

Secondly, if a name doesn't belong to any local variable (in the frame in the stack), then JS looks to the global object (`window`) to see if that has a property that match that name. Once accustomed to this rule, it is hard not to think of it as a matter of course. However, this is a **BIG** switch. Both cognitively and technically. While the local variables exists in a frame in the *stack*, the global object is in the **HEAP**.

To access other structures from the heap, you either go top-down (via the global object) or bottom-up (via arguments, including `this`). Thus, as long as you manage the references between your objects in the heap, you start nesting to that object from one of these two locations.

### 3. dynamic variables are stack variables

However, JS is lacking *one* variable type: dynamic variables. A dynamic variable is a variable that is a) declared in a frame in the stack and then b) is "automatically" made available to all frames that come on top of that frame, but c) not available from anywhere else. To help you see what I mean, I will show you what such a variable would look like:

```javascript
function inner() {
  return 1 + $$bob$$;
}

function middle() {
  return inner();
}

async function outer(something) {
  $$bob$$ = something;
  await new Promise(r => setTimeout(r, Math.random()*1000));
  return middle();
}

console.log(await outer(41));   //always 42
console.log(await outer(1));    //always 2

//stack trace like this
//4. inner
//3. middle
//2. outer
//1. main
```

If we actually ran the code above, it would return `2` twice around half the time. That is because `$$bob$$` would be a variable in the heap, shared by both async calls to `outer(..)`.

But, what I want you to do when you look at the example above is: **imagine** that dynamic variables would be marked with `$$name$$`. Dynamic variables are accessible to all subsequent calls in the same stack, but removed when the frame that declared them is taken out of the stack. Thus, when JS tries to find the value of `$$bob$$` from `inner()` it would look in the lower frames of the stack, going from stack frame 4, to frame 3, to frame 2, to retrieve its value. The dynamic variable `$$bob$$` would then be positioned in the stack at the second level. When the JS engine would search for the `$$bob$$` from frame 4. `inner()`, it would see no such `$$bob$$` in frame 4, no such `$$bob$$` in frame 3, yes `$$bob$$` in frame 2. The dynamic variable does not have to be passed as an argument into `inner()`. 

The `$$name$$` variables are never accessed via the heap/global object. They can only be found by the JS engine looking down the stack. When a frame is completed and taken off the stack, so is the dynamic variable. This means that they are not accessible to different call stacks to `outer()`, even when they run concurrently as in this instance. And that would mean that you would get a consistent set of `42` and `2` values from the example above. Again, no such dynamic `$$..$$` variables exists in JS. This is **just an imagined dialect of JS**.

## HowTo: make dynamic variables? part i

The most obvious method of making dynamic variables a reality in real JS is to pass them as arguments into the nested functions. This is simple, safe, and reliable:

```javascript
function inner(bob) {
  return 1 + bob;
}

function middle(bob) {
  return inner(bob);
}

function outer(something) {
  var bob = something;
  return middle(bob);
}

console.log(outer(41));   //42
console.log(outer(1));    //2
```

## HowTo: make dynamic variables? part ii

But, what happens when we need to pass down lots of complex arguments? Our first option is to wrap those arguments in a context object.

```javascript
function inner(context) {
  return context.two();
}

function middle(context) {
  return context.one + inner(context);
}

function outer(something) {
  var context = something;
  return middle(context);
}

console.log(outer({one: 'this really is ', two: () => 'something'}));//this really is something
```

This method is not super. Our code isn't very readable anymore. And, what if some of the functions start mutating our object. Because it actually need to do so? It gets real ugly real fast.

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