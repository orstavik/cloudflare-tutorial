# HowTo: `deepFreeze` any function?

> `Object.freeze` is kinda slow. For example, it is slower than `JSON.stringify`.

To `deepFreeze` an object is simple:

```javascript
function deepFreeze(anything){
  if(!(anything instanceof Object))
    return anything;
  for (let key of Object.getOwnPropertyNames(anything))
    deepFreeze(anything[key]);
  return Object.freeze(anything);
}
```

## HowTo: make a `freezer`?

We can make a regulator function to create a regulated version of any input function like so:

```javascript
function freezer(fun){
  return function(...args){
    return deepFreeze(fun(...args));
  }
}
```

## Demo: deepFreezeRegulator

```javascript
function freezer(fun){
  function deepFreeze(anything){
    if(!(anything instanceof Object))
      return anything;
    for (let key of Object.getOwnPropertyNames(anything))
      deepFreeze(anything[key]);
    return Object.freeze(anything);
  }

  return function(...args){
    return deepFreeze(fun(...args));
  }
}

function makeObject(key, value){
  const res = {};
  res[key] = value;
  return res;
}

const makeAndFreezeObject = freezer(makeObject);

const frozenAsAPopsicle = makeAndFreezeObject('hello', 'sunshine');
frozenAsAPopsicle.hello = 'rain';
console.log(frozenAsAPopsicle.hello); // => sunshine
```

## References
* [MDN: Object.freeze()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
* [MDN: Object.getOwnPropertyNames()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames)
