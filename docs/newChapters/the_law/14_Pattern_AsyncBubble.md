# Pattern: AsyncBubble

An AsyncBubble is an `async` immediately-invoking function expression:

```javascript
(async function () {
  try {
    //await something and
    //other async code here
  } catch (err) {
    console.error("AsyncBubble failed:", err);
  }
})();                                            
```

Note: if an `Error` is thrown inside the PseudoThread, no other code will process it. Therefore, wrapping the PseudoThread code in a `try{..}catch(err){console.error("PseudoThread failed:", err);}` is a good idea.

## Why: AsyncBubble?

When you add an event listener in JS, this event listener might need to `await` some `async` function. If you make your event listener `async`, you solve this problem. You can `await` all the `async` functions that you want.

But, to avoid blocking your JS application, the JS runtime will *start* other event listeners *while* other event listeners are still `await`ing their return. This means that you can have several event listeners running in parallel, *all* being able to read and write concurrently to all the same global objects. This means that `async` event listeners essentially become a multi-threaded environment in JS.

In sum, `async` event listeners:
1. each build their own stack;
2. each have their own flow of control;
3. run concurrently with other `async` and `sync` event listeners; and
4. share access to the same global objects.

`async` event listeners in themselves are not bad. But. The problem is that you the developer do not control the *timing* of the different threads against each other. This is something the `async` explicitly tells the JS engine to automate. So, you don't know which thread is writing what data at what time, and so you don't know what data is available to be read in each thread. When this occurs against the *same* data object, we are in trouble. And so, without any **good** strategy about how to handle this conflict, multi-threaded code very quickly evolves into the mother of all spaghetti code, every programmer's worst nightmare.

## HowTo: manage state with AsyncBubbles?

The AsyncBubble enable us to handle this problem of concurrent threads with the following simple steps:

1. Wrap all the `async` code inside an event listener in an AsyncBubble.
2. Make the event listener `sync` (again).
3. Pass data *into* the AsyncBubble as closure constants.
4. Pass data *out* of the AsyncBubble as either:
	1. browser: a new `Event` dispatched on the `window`.
	2. worker: as a regular return value (the AsyncBubble returns a `Promise` that will resolve to this value).

This results in *two* variants of the AsyncBubble: an EventAsyncBubble and PromiseAsyncBubble.

#### EventAsyncBubble

```javascript
;(async function () {
  try {
    //await something and
    //other async code here
    const event = new Event('my-custom-event-type');
    event.data = 'the data the AsyncBubble creates';
    dispatchEvent(eventWithData);
  } catch (err) {
    console.error("AsyncBubble failed:", err);
  }
})();                                         
```

When applied to a real app, the EventAsyncBubble pattern should produce *many* events during the execution of your application. If you started out with a handful of complex `async` event listeners for UI events, what you should end up with is roughly *two* handful of simpler `sync` event listeners: half of which are regular UI event listeners some with AsyncBubbles, some without; and the other half being event listeners for the AsyncBubble events, some with their own AsyncBubbles. Thus, AsyncBubbles should be anticipated to become a source for significant number of events.

#### PromiseAsyncBubble

```javascript
const bubbleOutput = (async function () {
  try {
    //await something and
    //other async code here
    return 'the data the AsyncBubble creates';
  } catch (err) {
    console.error("AsyncBubble failed:", err);
  }
})();                                         
```

## AsyncBubble rules of thumb

Rules of thumb for the code inside and outside the AsyncBubble are:

1. **`const` closure variables**. The closure variables passed *into* the AsyncBubble should be `const`. Why? Because a) code *inside* the AsyncBubble should *never* change the reference of any *outside* variables, and b) code *outside* the AsyncBubble should never change the value of any of the data sources that the AsyncBubble reads because then you don't really know if the AsyncBubble will read the old or the new data.

2. **Immutable closure variables**. The closure variables passed *into* the AsyncBubble should be immutable. It is fairly obvious that the code *inside* the AsyncBubble should not change outside properties (because that is spaghetti), but the same applies to code *outside* the AsyncBubble because (again) then you don't really know if the AsyncBubble will read the old or the new version of the mutated object. 

3. **AsyncBubble output is immutable**. When your AsyncBubble either sends an event with a data value/object or resolves a `Promise` with a data value/object, then the AsyncBubble should *not make any changes to that data* afterwards. Both data sent into and out of the AsyncBubble is immutable. Again, the same anti-spaghetti logic applies: if the AsyncBubble mutates the objects it has passed out to another thread, then you don't really know if that outside thread reads the old or the new version of that object.

4. **AsyncBubble *can* dispatch multiple events**. For example: you have an AsyncBubble that is given the task of `fetch`ing 100 files, and every 100ms you want this AsyncBubble to return a temporary status update. Not a problem! Make a timer that pass out the status of the AsyncBubble's task every 100ms until the task is complete. But! Again. When you do `dispatch` temporary results data with your `Event`s, then *make sure that the data that you pass out from the AsyncBubble is immutable*. For example: if you inside the AsyncBubble keep your 100 files in an `Array`, make sure that you `.slice()` that `Array` before you add it as data to the `Event` object inside the AsyncBubble.

My extra advice here is also:

**First**. When you make AsyncBubbles make sure you **immediately** start thinking about the function from where you create the PseudoThread as **another thread**, the initial thread. If this is a `sync` event listener (and you have no `async` event listeners), then think of that thread as the main thread.

**Second**. Make an **overview of all the closure constants** your AsyncBubble accesses. You must be conscious about which constants your AsyncBubble accesses all the time. 

**Third**. If mutating objects is a sin inside the same thread, then mutating objects across multiple threads is a deadly sin. Yes, it can be too costly and complecting to strongly enforce immutability by for example `deepFreeze`ing everything. But this doesn't mean that the alternative is *to mutate*, it simply means that you must take care, thread carefully, and clone or append objects when needed.

## HowTo: chain AsyncBubbles?

Can we nest AsyncBubbles? Is that a good idea? Or a bad idea?

```javascript
(async function () {
  //await something
  (async function () {
    //use something
  })();
})();
```

The answer: It is not a good idea to nest AsyncBubbles. It is not horrible, but it is not good. What you are most likely looking for is a mechanism to chain AsyncBubbles. Before we given the reason as to *why* it is better to chain than to nest AsyncBubbles, we will first illustrate *how*.

### HowTo: chain PromiseAsyncBubbles?

```javascript
const stepOne = (async function () {
  //await something
  return something;
}());

// stepOne.then(something=> global.state.something = something);
stepOne.then(async function (something) {
  //await something else
});
```

### HowTo: chain EventAsyncBubbles?

In the browser, you would nest via event listeners instead of via the `.then(...)` call.

```javascript
addEventListener('update', function (e) {
  const something = e.target.value;
  //global.state.updateThing = something;
  (async function () {
    const derivativeOfSomething = await fetch(something);
    const event = new Event('some-event');
    event.data = derivativeOfSomething;
    dispatchEvent(event);
  })();
});

addEventListener('some-event', function (e) {
  const derivativeOfSomething = e.data;
  //global.state.someThing = derivativeOfSomething;
  (async function () {
    const derivateOfderivative = await fetch(derivativeOfSomething);
    const event = new Event('some-other-event');
    event.data = derivateOfderivative;
    dispatchEvent(event);
  })();
});

addEventListener('some-other-event', function (e) {
  const derivateOfderivative = e.data;
  //global.state.someThingElse = derivativeOfDerivate;
});

```

### Why: chaining instead of nesting AsyncBubbles?

Why? Why is it better to chain than to nest? As you can see in the code above, some steps updating a `global.state` property is commented out at various positions. By using chaining, either via promises or via event listeners, we can more clearly *see* in from the context where we create the AsyncBubble *when* and *what* global state properties are being set. We want to *show global state changes* in our code at the *top level* (main thread/sync event listener). Chaining allows us to do that, nesting not so much.

Mind you, the underlying race conditions are the same in both instances. But. When the act of updating the global state is hidden deep inside `async` functions behind several layers of `await`, then it is difficult to see *how* delayed one state change is. By making AsyncBubbles that either return a `Promise`, we make more explicit the "bubble" of time that lies between the coming state change; by making AsyncBubbles that dispatch an `Event`, we make explicit in the event queue that this state change will occur possible after several other intermediate events. The bubble *better show* the race conditions.

## References

*