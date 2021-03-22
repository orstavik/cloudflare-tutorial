# WhatIs: higher-order functions?

A higher-order function (hof) is a function that either takes a function as an argument and/or returns a function as its result.

## WhatIs: FIDO?

FIDO stands for Function In Data Out. They are the simplest and most commonly used higher-order functions around. Javascript use FIDOs "everywhere":

* `addEventListener(..)`,
* `setTimeout(..)`,
* `setInterval(..)`,
* `requestAnimationFrame(..)`,
* `Array.prototype.map(..)`,
* `Array.prototype.filter(..)`,
* `Array.prototype.sort(..)`,
* `Array.prototype.find(..)`,

All FIDOs:

1. ***ITERATE*** over a set of data. For example:
	* `Array.prototype.map(..)` iterates over the entries in the `Array`, 
	* `Array.prototype.findIndex(..)` iterates over the entries in the `Array` *until it finds a matching element*, 
	* `setInterval(..., ms)` iterates of a series of points in time, and
	* `addEventListener(..)` iterates over all future instances of the observed event.
	  
   What might not be so easily recognized is that `setTimeout()` and `requestAnimationFrame()` also *iterate*: they iterate over future points in time **but only upto and including the first point**. It might seem strange to call this a form of iteration. But it is. And, when you fashion FIDOs you need this perspective both to first) see the potential stream of events/data points that *might* be iterated, and second) to better adapt your FIDO to use cases against that stream. 

2. apply their **input function at each point in the iteration**. Now, in theory, you *can* make a FIDO applies no function during each point of the iteration. You can also make an infinite loop. And dedicate your life to growing the universe's biggest tomato on the surface of Mercury. But. In practice, this is not likely to bear much fruit. Caveat: I have never been to Mercury.  

3. operate against a **stateful context**: the `.map(..)` works against an `Array`; the `addEventListener(..)` works against a `DOMNode` instance and a stream of events; the `setTimeout(..)` is associated with a `window` instance and its time.

4. **RETURN VALUES**, as in DataOut. This is obvious in the case of for example `Array.prototype.filter(..)` return another array. But this is also true for `addEventListener(..)` that return `undefined` and `setTimeout(..)` that return an number.
    
    Now, a FIDO *can* return `Function` objects. For example, you might filter an array to include only `Function` objects. But. When a FIDO does so, it doesn't *create* these functions, it only treats them as some kind of data point. Again, you might envisage a tomato growing on Mercury, but again, I'm not sure that is fruitful nor practical.

> By keeping their output as values, FIDOs remain simpler. This is why you see this pattern in many of the native Javascript FIDOs. This is not because the alternatives are impossible to imagine: for example, `setTimeout(..)` could have returned a specific `clearTimeout()` function instance, that could be used to cancel the iteration inside the `setTimeout()` instance. But. When FIDOs return pure values, systems become conceptually simpler and FIDO pairs such as `setTimeout()` and `clearTimeout()` are conceptually easy to grasp. 

## WhatIs: DIFO? 

A function that takes data as input and produce a function as output. Hm... Where have I heard about that again? ... Ah! Yes! Machine learning! You don't say?!? :)

Machine learning is to create function machines that take Data In (a training set) and then creates/"trains" a function which can be used to tackle produce relevant/useful given some future input data.

There are many different ways in which a machine teacher DIFO could "train" a function based on input data. Most commonly, the machine trainer would process the DataInput into a set of tables, vectors, matrices, select algorithms and/or even create algorithms that in turn will produce an output value for a hitherto unknown input value.

## WhatIs: FunFunFun? (sorry, the acronym FIFO was already taken)

> To 'regulate' stems from the latin word 'regula' which means 'rule'.

A FunFunFun is:
1. a higher-order function (fun 1), that
1. take an input, **original** function (fun 2), and
2. output a **regulator** function (fun 3).

The **original** function is commonly an ordinary, first order, DataInDataOut (DIDO) function. Again, sure, you can regulate another higher-order function, but I will discuss that in the chapter about Mercurian tomatos.

The **regulator** function is the key in the FunFunFun. The **regulator**:
1. takes a set of arguments,
2. regulate the arguments,
3. calls the original function with its (regulated) arguments,
4. regulate the original output,
5. returns the (regulated) output.

The **FunFunFun** often establish its own state which one or more regulators can use when they regulate the arguments, the output, and/or the invocation to the original function.

Below is a funFunFun sketched in JS code. 

```javascript
function funFunFun(original) {
  return function regulated(...args) {
    //regulate input
    const originalResult = original(...args);
    //regulate output
    return originalResult;
  }
}

const myRegulatorFunction = regulatorFunction(myOriginalFunction);
const x = myRegulatorFunction(1, 2, 3);
```

**Note:** As will become clear in the coming tutorails, FunFunFuns:
1. often produce *extra* outputs such as functions, promises, values *in addition to* the regulator function, and
2. can just output a **list of regulator functions** from an equivalent **list of original, input functions**.

## WhatIs: regulate (i)? observe

The first thing a regulator function does is simply to **observe** the input and output of an original function.

```javascript
function regulator(original) {
  return function observed(...args) {
    console.log('input to: ', original.name, args);
    const originalResult = original(...args);
    console.log('output from: ', original.name, originalResult);
    return originalResult;
  }
}

Math.abs = regulator(Math.abs);
Math.abs(-12); 
//input to: ', abs, [-12] 
//output from: ', abs, 12 
```

The use case for simply **observing** the input and output of particular functions are: 
 * debugging, 
 * logging, 
 * unit testing,
 * user analytics, 
 * machine learning,
 * and more. 

However, the sharp eye can see that these use cases are not directed against the "normal user", the eyeballs of the application; they are directed at the developer/system manager/analyzer. They are part of producing a meta-perspective from/on the app itself. 

## WhatIs: regulate (ii)? constrain input/output/function calls

In theory, the regulator function can produce any output. In theory, we can also grow big tomatoes on Mercury. However, in practice, the regulator function *almost always* produce *the same* or a *highly correlated* output with the original function. The regulator is "a version of the original function" that "outputs a version of the output from the original version".

When the regulator *changes* the output/input from/to the original function, these *changes* are small and can be understood as either systematically restricting, duplicating, negating, or filtering the original output.

## References

 * [Understanding Higher-Order Functions in JavaScript](https://blog.bitsrc.io/understanding-higher-order-functions-in-javascript-75461803bad)
 * [Eloquent JavaScript: Higher-Order Functions](https://eloquentjavascript.net/05_higher_order.html)
 * [What color is your function?](https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/)