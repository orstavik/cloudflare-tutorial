# HowTo: manage state?

In this article we will describe how you can use regulators to manage state *as an optional afterthought*.

## WhatIs: state?

What does "state" mean when we talk about it in programming? Let's begin by dumbing it down a little: "state" essentially means "all the data that accumulate when an instance of your application runs one time in one place". *All* the state of your application would therefore be *any* variable set inside *any* function of your app *from* the app starts *until* the app ends.

But, programmers don't explicitly manage *all* their state. For example, if an app imports a set of functions, then the programmer do not intend to manage the state of the variables inside these imported functions: the whole point of importing functions is to *avoid* managing those variables. Furthermore, when an app ends, the programmer rarely care about the sequence and when the variables are removed. Thus, the programmer do not intend to manage the state from the absolute beginning till the absolute end: the programmer is mostly interested in specific, often-repeating sections in an app's instance life cycle.  Thus "state" means "relevant variables from specific time frames from one program instance". 

## HowTo: slice state?

The key *when managing state* is therefore to know a) how to slice out the *relevant variables* and b) slice out the *relevant time frames*. If you can clearly delineate the relevant variables from the irrelevant ones, and clearly delineate *when to start* and *when to end* managing these variables, then you are pretty well set.

So, Ivar the Oracle, do you have any words of wisdom as to how I should do that in JS? Yes, I do actually, and these tips are both stupenduosly simple and elegantly profound once you understand the rationale behind them.

1. In JS, the event loop is the major organizing machinery of any app. All function invocations are essentially driven by the call of an event listener (even if that event is an imaginary `do-load-script` event). Now, the variables and the work being done by the JS engine use to organize the event loop is irrelevant (the app developer can rest easy taking the event loop for granted). We are only looking at the state changes from the perspective of the event listener's (and above in the stack).

2. Lots of functions are simple, pure input/output machinery. For example, if you in your app calls `Math.hypot(3,4)`, then the relevant variables are the arguments `3, 4` and the answer `5`; remembering the inner variables of `Math.hypot(3, 4)` such as `9, 16, 25` are irrelevant. How far up you can draw this line depends on both the confidence of the developer in the inner workings of the functions used, and potential usecases for these variables.

3.  However, what happens is that you end up with a fairly thin layer (one function, or one function calling a handful of other functions) that hold *all* the relevant variables in your application. In fact, you should strive to make your apps so that *one* function holds *all* the relevant variables: `handleRequest` or `handleEvent`. This means that you slice away functions and their variables from the top of your app (event listener preprocessors rarely hold relevant state) and from the bottom (you don't care about the variables inside imported functions (or simple, pure input/output functions), and then you end up with a thin slice of *important, relevant functions that has variables that you need to manage*.

4. The functions also holds a perspective of time. The time slices that you need *begin* when one of your important functions *start* and *ends* when *all* or *some* of the async processes spawned by this function ends. You want the `fetchEvent.waitUntil(..)` to wait until all relevant variables are calculated from all spawned async processes.

5. What you end up with is that you need to manage state within certain function calls. There are *one* or a few functions in your app that do critical operations, and you want to manage the state within their execution (and the execution of any async processes spawned by those functions).

6. The end result is that you end up with *not* managing the state of your application, but that you end up with managing the state of some key event listeners (or functions called tightly from your event listeners).

## HowTo: Manage state and time together?

When we write JS, we are writing in a sequential format. One thing happens before another, and we can in our code describe multiple paths that contain code that are not called upon during the running of one function instance. For example: `if(something) a(); else b();` will not trigger both `a()` and `b()`. Furthermore, as `async` sub-processes can run in parallel and end in different order each time, you cannot assume that you always know which function was responsible for producing what variable value in your critical function and in what sequence the variables were populated.

Thus, when you think about state, you should think about your state as a timeline with variables in which you variables might change. Your state is both a "trace" of which functions created what variables, and a classic variable to value map.

Thus, when you decide upon what state you need to manage, you:
1. slice away irrelevant functions above and below your critical functions, 
2. slice away irrelevant preprocessing at the beginning and irrelevant async processes at the end,
3. make sure that you don't slice away relevant async processes at the end, and then
4. include a static (spatial) description of the trace of that critical function so that you include the time, 4th dimension of the evolution of the relevant variables in your critical functions.

> When we say "time" management, that means to observe and provide a callback to when a function is called More specifically, this means to observe when and in what sequence a set of functions are called and  to observe, manage, control, and/or restrict  pattern is super useful for especially state and execution flow management, ie. the observation, management, control and restrictions of a set of functions, either seen only in relation to each other, or in relation to a (state) object or fixed timeline. The correct application of the CrowdCombinator pattern can replace lots of build tools and other library resources, when wielded well.


## Regulator: `stateManager(...originals)`

```javascript
function stateManager(...originals) {
  const trace = [];
  let count = 0;
  const regulators = originals.map(original => {
    const name = original.name;
    const regulator = function (...args) {
      const id = count++;
      try {
        trace.push({id, name, args});
        const output = original(...args);
        if (!(output instanceof Promise)) {
          trace.push({id, name, type: 'sync', output});
          return output;
        }
        const asyncStatus = {id, name, type: 'async', pending: output};
        trace.push(asyncStatus);
        output.then(output => trace.push({id, name, type: 'async', output}));
        output.catch(error => trace.push({id, name, type: 'async', error}));
        output.finally(() => delete asyncStatus.pending); //att! mutation.
        return output;
      } catch (error) {
        trace.push({id, type: 'sync', name, error});
        throw error;
      }
    };
    Object.defineProperty(regulator, 'name', {value: '_sm_' + name});
    return regulator;
  });

  //return the trace. If an object is passed in, then any argument or output value matching a property will be renamed.
  function inspectState(obj = {}) {
    const reverseLookup = new Map(Object.entries(obj).map(([one, two]) => [two, one]));
    return trace.map(({id, name, type, output, error, pending, args}) => {
      const res = {id, name, type};
      pending && (res.pending = true);
      type && (res.type = type);
      args && (res.args = args.map(arg => reverseLookup.get(arg) || JSON.stringify(arg)));
      output && (res.output = reverseLookup.get(output) || JSON.stringify(output));
      error && (res.error = reverseLookup.get(error) || error.toString()); //todo how to log errors
      return res;
    });
  }

  //if recursive == true, then ready returns true only when no tasks remain pending.
  //else, the ready await all pending tasks at the point queried returns
  async function ready(recursive) {
    let pendingTasks = trace.filter(({pending}) => pending);
    await Promise.allSettled(pendingTasks);
    pendingTasks = trace.filter(({pending}) => pending);
    if (!recursive)
      return !pendingTasks.length;
    while (await pendingTasks) {
      pendingTasks = trace.filter(({pending}) => pending);
      if (!pendingTasks.length)
        return true;
    }
  }

  return [inspectState, ready, ...regulators];
}

Math.sum = (a, b) => a + b;


const [inspectState, ready, sum, pow, sqrt] = stateManager(Math.sum, Math.pow, Math.sqrt);

function hypotenuse(a, b) {
  return sqrt(sum(pow(a, 2), pow(b, 2)));
}

const state = {a: 3, b: 4};
state.c = hypotenuse(3, state.b);
console.log(inspectState(state));    // ["pow", "pow", "sumImpl", "sqrt"]
console.log(ready());
```

Simple solutions built with this pattern can replace both state management solutions such as Redux and development tools such as unit testing.

## References

* 

