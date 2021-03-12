# HowTo: reuse and dirty check?

> `memoize(fun)` a) *reuses* whole objects, and b) avoids calling the original function if the arguments are registered; `reuse(fun)` a) memoizes *both* whole objects and object fragments, but b) always calls the original function when invoked. **Memoize caches function calls, reuse caches function output values.**

## WhatIs: dirty checking?

To dirty check is to check for object equality using `===`. It is super fast. But. Often, objects that are conceptually equal (identical in value and structure) are not equal in terms of `===`. That is why we say that `===` is "dirty". For example, `{hello: 'sunshine'} === {hello: 'sunshine'}` returns `false`. Why? Because a) the javascript engine creates two different object instances to represent identical values and structure, and b) the `===` only compares the references to the object instances in JS. Conceptually identical objects are different object entities and therefore do not pass the dirty `===` check.

There are two solutions to this dirty problem:

1. The "common sense" approach is to replace the dirty `===` check with a cleaner, but heavier `equals(a,b)` check that *also* check for structural and value equality in objects.
2. The more "convoluted" approach is to *not* create two identical objects in the first place, but instead *reuse* the first object when creating a second object with identical values and structure.

The "common sense" approach is better than the "convoluted" approach in several ways:

1. It is simpler. It addresses the problem where it originates and where you encounter it (yes, if for example `====` had checked for conceptual equality as efficiently, then you could simply have switched to that check instead).
2. It is easier to apply as needed: a developer is more likely to have access to objects where they are used/checked (higher level), as opposed to where they are created (lower level).

But. On current JS platforms, the "convoluted" approach also has benefits over the "common sense" approach:

1. Objects are often compared more frequently than created. Sometimes, an object instance can be compared hundreds of times. So, if you can *prepare* your object instances in a way that enables *faster* comparison, your system becomes more computation efficient.
2. Some times, the app needs many, many versions of the same object. This commonly occurs when a branch in a larger acyclic graph object remains fixed while another branch fluctuates (cf. the history of State in a single state applications). This would take up lots of space in memory if all objects were created anew each time instead of reused.
3. Yes, you the developer may have easier access to *some* of the locations in your code where the objects are checked compared to where they are created. But. *Some* checks might be *harder* to reach, for two reasons: 1) they might be encapsulated in other people's code (common); and 2) they might hide in plain sight being implicitly called by other functions that you use (also common). For example, the best template engines use dirty checking to avoid unnecessary rendering, and the `!==` is also dirty checking, in case you forgot to look for it. This means that replacing *one* dirty check with a full value-structure-equality function might still leave *two* other dirty checks inside your code that you overlooked. Thus, most often it is *easier* to *find all locations* of object creation, than it is to find all the locations of object comparison.

This all leads to a counter-intuitive conclusion: instead of simply fixing the problem of dirty checking directly by employing a full value-structure-equality function where you need it, you should instead ignore a) the rule fix-problems-directly and b) the rule code-for-simplicity-not-performance.

## HowTo: reuse an object (i)? waste `em!

When reusing objects, it is common to a) create a new object instances first, b) then compare those object instances to existing objects (in some way), then c) replace the new object instances with existing object instances where possible, and then d) discard the just minted new object instances. Which is wasteful.

However, this waste is almost always necessary. Why? When your function builds a new result, it needs to do so in a step by step manner: "if this property then that add this property". Inside the function code, you can remember these properties in two ways: variables or temporary objects. And. Almost always, when you need to return an object of some kind, it simply isn't worth it juggling 20 local variables and passing them in and out of different functions just to avoid making a couple of temporary object instances.

## HowTo: reuse an object (ii)? the registry and `JSON.stringify(..)`

When we have created a new object instance, we need to compare it against old object instance(s). And here, some questions arise:

1. How many old object instances do we need to keep around and compare against?
2. How should we compare whole/parts of the new object instance with whole/parts of the old object instances?
3. How should we register the old object instances to match the requirements of the comparison function?

The answers are:

1. You should not underestimate the potential of comparing equality of objects between *more than two objects*. Comparing two objects enable patterns such as timetravel; comparing three objects or more enable even more patterns of *emergent* behavior (of course, the patterns are not emergent from the code, they just emerge in the code because you were unaware of them).

2. **Nothing beats `JSON.stringify()`** when you compare objects for value and structure equality in 2021. Even if you only iterate and compare the keys of two tiny objects with only three entries with string and integer values, it is several times faster to compare the objects using `JSON.stringify()`.

   Because a) checking for value-and-structural-equality via `JSON.stringify()` is soooo much simpler *and* more efficient than the alternatives, and b) there are really only edge-cases where objects can be equal in terms of value and structure while *not* being JSON-equal (do you really, really need to distinguish between `null`, `undefined`, and unset in your pure data objects?), it is really hard to justify pursuing any other approach for value-and-structural-equality checking when comparing two objects in terms of reuse.

3. **Nothing beats strings** in terms of memory efficiency. The JS engine can do magical compression algorithms at super low-levels in order to efficiently store the string values. So. Storing keys as strings, even when these strings are mostly variants of each other, should be super efficient.

   This in turn means that creating a dictionary of JSON representations of objects and object fragments pointing to a reusable entity should *also* be the most efficient register reusable objects.

All this leads up to yet another somewhat counter-intuitive conclusion: It is *more* efficient, both in terms of memory and computation, to add an intermediate step and `JSON.stringify()` objects before comparing them and to store this intermediate representation as keys to old objects.

## Some code. Finally

```javascript
const objRegister = {};

function reuse(obj) {
  if (!(obj instanceof Object))
    return obj;
  const json = JSON.stringify(obj);
  if (json in objRegister)
    return objRegister[json];
  let res = {};
  for (let key of Object.getOwnPropertyNames(obj))
    res[key] = reuse(obj[key]);
  return objRegister[json] = res;
}
```

Due to the recursive nature of the `reuse(obj)` function above, the `objRegister` will quickly fill up with not only the uppermost given object, but also all its inner children. Thus, if 3 unrelated objects with 10 inner child objects are matched, the register will fill with 30 different objects. And the register will remember these objects forever, until the app crashes for lack of memory.

But. To `reuse(obj)` is not all gloom and doom and memory ca-boom.

1. For each json key and object passed to the `reuse(obj)` function, the registry only duplicates partial keys and values. The new keys are substrings of the main register key, and the value is a partial object of the main object. These partials are already kept alive in the heap by the main entry, and so adding them only adds the equivalent of 2-3 object pointers in memory. Thus, the registration of partials is likely of limited consequence in terms of *real* memory consumption.

2. If you call `reuse(obj)` on a stream of objects that are *not* structurally correlated nor contain recurring values, that is not the fault of `reuse()`. Here, you simply shouldn't apply `reuse(obj)`.

## Transient vs. persistent streams of objects

`reuse(obj)` is implicitly applied to a stream of objects: `reuse(firstObject)`, then `reuse(secondObject)`, etc. etc. Some such object streams are **transient**: the objects in the stream are only used immediately, and then simply garbage-collected once a particular cycle ends. Other object streams are **persistent**: the objects in the stream are for example kept in an `Array` and thus kept alive in memory.

If `reuse(obj)` is working against a **persistent object stream**, then it is essentially only providing an index to a set of objects already kept in memory. Here, the `objRegistry` inside `reuse(obj)` is quite efficient, and you are not consuming that much more real memory (att! this is a statement that rely on the implementation of the JS engines handling of strings, over which I have no control;).

If `reuse(obj)` is working against a **transient object stream**, then the `reuse(obj)` will turn the object stream into a **persistent object stream**. This might be a good move. There might be features that open up when your object stream is persisted that you benefit from. But. This might also be bad. You might wish to keep the object stream transient (you have no need for the persistent stream, or you lack the memory to keep it). In such circumstances, you would like a `reuse(obj)` that create a *transient object stream*.

`reuse(obj)` for *transient object streams* is very similar to the above `reuse(obj)`: structure and value equality is still best done via `JSON.stringify()`. However, the `reuse(obj)` must "forget" all but the last objects in the stream. It does so by making a new `objRegistry` each time.

```javascript
function reuseImpl(obj, register, newRegister) {
  if (!(obj instanceof Object))
    return obj;
  const json = JSON.stringify(obj);
  if (json in register)
    return newRegister[json] = register[json];
  let res = {};
  for (let key of Object.getOwnPropertyNames(obj))
    res[key] = reuseImpl(obj[key], register, newRegister);
  return newRegister[json] = res;
}

const oneObjRegister = {};

function transientReuse(obj) {
  const newRegister = {};
  obj = reuseImpl(obj, oneObjRegister, newRegister);
  oneObjRegister = newRegister;
  return obj;
}
```

## HowTo: streamline persistent object stream?

In theory, the memory consumption of a persistent object streams with a) **finite number of structures** and b) values with restricted length, should follow c) a logarithmic curve and eventually flatten out. In practice, however, values can be so diverse that the memory consumption of an object register will crush any app if `reuse(obj)` is called enough times. Thus, the `reuse(obj)` (and objects in the stream of persistent objects) needs limits.

The scope of the `objRegistry` can be limited using LRU pattern. As with the memoization technique, we can ensure that only up to a finite number of objects are ever present in the register, and then prioritize the objects that are most recently used.

```javascript
const objRegister = {};
const limit = 100;

function reuse(obj) {
  if (!(obj instanceof Object))
    return obj;
  const json = JSON.stringify(obj);
  if (json in objRegister) {
    const value = objRegister[json];
    delete objRegister[json];
    return objRegister[json] = value;
  }
  let res = {};
  for (let key of Object.getOwnPropertyNames(obj))
    res[key] = reuse(obj[key]);
  const keys = Object.keys(objRegister);
  keys.length >= limit && (delete objRegister[keys[0]]);
  return objRegister[json] = res;
}
```

## `reuse(fun)` regulators

This chapter builds on the `memoize` chapter's final solution.

```javascript
function reuse(original, keyLimit = 100) {

  const cache = {};

  function reuse(obj) {
    if (!(obj instanceof Object))
      return obj;
    const json = JSON.stringify(obj);
    if (json in cache) {
      const value = cache[json];
      delete cache[json];
      return cache[json] = value;
    }
    let res = {};
    for (let key of Object.getOwnPropertyNames(obj))
      res[key] = reuse(obj[key]);
    const keys = Object.keys(cache);
    keys.length >= keyLimit && (delete cache[keys[0]]);
    return cache[json] = res;
  }

  const regulator = function (...args) {
    const res = original(...args);
    return res instanceof Promise ? res.then(res2 => reuse(res2)) : reuse(res);
  }
  Object.defineProperty(original, 'name', {value: '_reuse_' + original.name});
  return regulator;
}
```

## HowTo: `memoize` + `reuse`?

Can we combine the memoize and reuse regulators? And if so, how, and with what consequences?

```javascript
function memoizeAndReuse(fun, memLimit = 100, reuseLimit = memLimit * 3) {   //best
  return memoize(reuse(fun, reuseLimit), memLimit);
}
//or
function reuseAndMemoize(fun, memLimit = 100, reuseLimit = memLimit * 3) {   //good
   return reuse(memoize(fun, memLimit), reuseLimit);
}
```

`memoizeAndReuse` wraps a memoize regulator around a reuse regulator that in turn wraps the original function. This means that the memoize is called first, and if the memoize hits, it will return the remembered value. If the memoize is not a hit, then the function will invoke the inner function, and then reuse as much as from previous outputs of the same function.

`reuseAndMemoize` wraps a reuse regulator around a memoize regulator that in turn wraps the original function. The first difference here is that the reuse process will be run also on objects that are retrieved from memory. This is inefficient. The second difference is that if the memoize cache remembers invocations further back in time than the reuse register, then the reuse process can be applied to objects in the memoized output that *might* have been lost along the way.

The best approach is to use `memoizeAndReuse`, and then try to ensure that you set sensible memLimit and reuseLimit. An example of what to consider when setting the `reuseLimit` is as follows. You want the `memoize` to remember the last 50 recently input arguments. This could be the last 250 user cookies (you imagine that your system has 100+/-100 users that are active at the same time). These user objects contain result objects with 2 branches, one that vary from user to user, and another that vary within approximately 16 enumerations. Of these enumerations, there are 10 common objects that should consistently repeat themselves within 100 hits. You therefore set the memLimit to 250 and the reuse limit to 110. This should give you reusable objects for the 10 most common reusable scenarios.

## References

* 