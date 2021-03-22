# Pattern: higher-order methods (Monad part ii)

In Monad part i, we described a series of rules for what a monad should be. If you already know a little about monads, you were probably surprised that a) it didn't include higher-order methods, and b) that it still purported to define what the Monad pattern is. Let me just say, it surprised me too.

I will summarize the situation as follows. The "monad pattern" is actually independent of higher-order functions, but higher-order functions become so blatantly necessary when you create monads, that they soon appear integral to the monad pattern itself. Here is how and why.

## Problem: method bonanza

First, let's imagine that monad convert methods only accept values as input. That is fine. For example, we can have a monad that is wrapped around a list of numbers, and then make a convert method that will add a number to each number in the list and return a new monad with that new list of numbers:

```javascript
class NumberMonad {
  constructor(numbers) {
    this.numbers = numbers;
  }

  addToAll(a) {
    const res = [];
    for (let b of this.numbers)
      res.push(a + b);
    return new NumberMonad(res);
  }
}

const plusTwo = new NumberMonad([1, 2, 3]).addToAll(1).addToAll(1);
```

This looks fine! We have a monad `constructor` and convert method `addToAll(a)` and we can use them and chain them. Nice! We like this monad and want to build on it. So, let's also give it the ability to subtract, multiply, and divide:

```javascript
class NumberMonad {
  constructor(numbers) {
    this.numbers = numbers;
  }

  addToAll(a) {
    const res = [];
    for (let b of this.numbers)
      res.push(a + b);
    return new NumberMonad(res);
  }

  subtractToAll(a) {
    const res = [];
    for (let b of this.numbers)
      res.push(b - a);
    return new NumberMonad(res);
  }

  multiplyToAll(a) {
    const res = [];
    for (let b of this.numbers)
      res.push(a * b);
    return new NumberMonad(res);
  }

  divideToAll(a) {
    const res = [];
    for (let b of this.numbers)
      res.push(b / a);
    return new NumberMonad(res);
  }
}

const plusTwoMinusOneTimesFiveDivide4 = new NumberMonad([1, 2, 3]).addToAll(2).subtractToAll(1).multiplyToAll(5).divideToAll(4);
```

Ok. It works. But we are starting to see some problems:

1. The code has bloated. This simple object is now 30 lines of boilerplate, *and* we can already see that this is just the beginning.
2. The code is inefficient. We must iterate the entire list for each operation; we cannot apply all the mathematical expressions at each element before moving on to the next.

To fix these problems, we (abruptly) decide to use another pattern: higher-order methods.

## HowTo: higher-order methods?

In JS `function`s are first class citizens. That means that we can send them around as arguments. This means that we *could* potentially pass in "the mathematical expression" as an argument to the monad methods. And thus transform the four convert methods into one. How can we do that?

So, what do the four convert methods above have in common? Well, they all a) **iterate** over the list of numbers inside the monad, then b) apply a mathematical operation to each number, and then c) return a new monad and state to the user. Thus, instead of hard-coding the mathematical expression inside each method on the monad, we could instead 1) pass the mathematical expression in as an argument to a generic method on the monad, and then 2) the monad method could iterate over the numbers in the monad and apply the mathematical function to each element, and 3) return the results.

In more precise terms:
1. A monad convert method that gets an abstract function object as an argument.
2. The convert method iterate all the entries in the monad.
3. For each entry, the convert method calls the abstract argument function,
4. and the convert method here passes the entry in its state as an argument to the argument function.
5. The convert method puts the result of the abstract argument function into a new state object.
6. And finally, the convert method wraps the new state inside a new monad object instance and return the new monad instance to the caller?

And we call this convert method `.map(..)`.

```javascript
class NumberMonad {
  constructor(numbers) {
    this.numbers = numbers;
  }

  map(anAbstractFunction) {
    const res = [];
    for (let b of this.numbers)
      res.push(anAbstractFunction(b));
    return new NumberMonad(res);
  }
}

function plus2(n) {
  return n + 2;
}

function minus1(n) {
  return n - 1;
}

function times5(n) {
  return n * 5;
}

function divideBy4(n) {
  return n / 4;
}

const plusTwoMinusOneTimesFiveDivide4 = new NumberMonad([1, 2, 3]).map(plus2).map(minus1).map(times5).map(divideBy4);
```

The final step is to clean up the code using our monad:

```javascript
class NumberMonad {
  constructor(numbers) {
    this.numbers = numbers;
  }

  map(aMathematicalFunction) {
    const res = [];
    for (let b of this.numbers)
      res.push(aMathematicalFunction(b));
    return new NumberMonad(res);
  }
}

function plus2minus1times5divideBy4(n) {
  return (((n + 2) - 1) * 5) / 4;
}

const array2 = new NumberMonad([1, 2, 3]).map(plus2minus1times5divideBy4);
//or just .map(n => (((n + 2) - 1) * 5) / 4); 
```

We now have a recognizable monad: an object with a higher-order convert method.

## Higher-order convert methods

The thing about monads is that you most often only need a *handful* of convert methods that repeat themselves again and again from different monads. Let's discover repeating patterns here by listing the convert methods found in JS `Array` and jQuery:

* `Array`: `.map()`, `.filter()`, `.flat()`, `.flatMap()`, `.slice()`, `.concat()` (and `.reduce()` and `.reduceRight()` when they return an `Array()`. 
* `$`: `.add()`, `.addBack()`, `.children()`, `.clone()`, `.closest()`, `.contents()`, `.end()`, `.eq()`, `.even()`, `.filter()`, `.first()`, `.has()`, `.last()`, `.map()`, `.next()`, `.nextAll()`, `.nextUntil()`, `.not()`, `.odd()`, `.offsetParent()`, `.parent()`, `.parents()`, `.parentsUntil()`, `.prev()`, `.prevAll()`, `.prevUntil()`, `.siblings()`, `.slice()`.  

Although it can seem like a jungle, it isn't. 

1. Both `Array` and jQuery: `.map()`, `.filter()`, `.slice()`, `.concat()`/`.add()`.

2. Only `Array`: `.flat()` and `.flatMap()` focus on nested `Arrays`.

3. Only jQuery 1: convert methods *shifting* position in the DOM step(s) up, down, forward, and backwards: `.children()`, `.closest()`, `.contents()`, `.next()`, `.nextAll()`, `.nextUntil()`, `.offsetParent()`, `.parent()`, `.parentsUntil()`, `.prev()`, `.prevAll()`, `.prevUntil()`, `.siblings()`.

4. Only jQuery 2: `.slice()` variants `.eq()`, `.even()`, `.first()`, `.last()`, and `.odd()`. This  

5. Only jQuery 3: `.filter()` variants `.has()` and `.not()`.

6. Only Jquery 4: `.clone()`. jQuery can do this, `Array` cannot, because jQuery a) holds only `DOMNode`s and b) `DOMNode.cloneNode()`.

7. Only jQuery 5: `.end()` and `.addBack()` show how a converted chain of jQuery objects can work as a stack: `.end()` goes one step back in the stack, `.addBack()` merges the previous frame in the stack into the current frame.

Here are some highlights from the list above:

1. Your monad will likely have a `.map()`, `.filter()`, `.slice()`, `.concat/add/assign()`.

2. There are several ways to `.slice()` a monad pie. These functions essentially provide a *custom iteration algorithm*.

3. With a) `.filter()` and b) an external variable, you can quickly replicate all `.slice()` and `.filter()`/`.slice()` variants.

4. If you can make assumptions about the properties of the internal state that your monad wraps, then you can make monad specific convert methods such as `.clone()` and `.flat()`.

5. You don't need `.end()` and `.addBack()`. They are only there to support chaining without stop. I don't recommend using them, I especially recommend implementing them in a Monad, but they do illustrate how monads can be used to branch and manipulate execution stacks.
```javascript
const one = $('h1');
const two = one.next();
const oneTwo = one.add(two);

const oneTwo = $('h1').next().addBack();
```

6. jQuery illustrate how monads can be used against a known universe: the DOM. `Array` illustrate how monads can be used against an unknown universe. You can traverse a universe that is known. 

## Higher-order side-effect methods

When you need to make generic higher-order method for side-effects, the equivalent to `.map(..)` is `.each(..)`. The purpose of `.each(..)` is to simply *iterate* through the inner state content of the monad, and then call a function on each entry. The purpose of this function is *commonly* to affect some state changes outside the monad based on the monad's current state. 

## Higher-order query methods

The most prominent higher-order query method in `.find(..)`.

## References

*
