# WhatIs: dynamic variables?

How does JS resolve variables? What is a JS variable? And what is *not* a JS variable? Big questions, answered quickly.

## 1. JS names are frame variables.

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

## 2. names are global variables

Secondly, if a name doesn't belong to any local variable (in the frame in the stack), then JS looks to the global object (`window`) to see if that has a property that match that name. Once accustomed to this rule, it is hard not to think of it as a matter of course. However, this is a **BIG** switch. Both cognitively and technically. While the local variables exists in a frame in the *stack*, the global object is in the **HEAP**.

To access other structures from the heap, you either go top-down (via the global object) or bottom-up (via arguments, including `this`). Thus, as long as you manage the references between your objects in the heap, you start nesting to that object from one of these two locations.

## 3. dynamic variables are stack variables

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

## References

* 