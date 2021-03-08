# HowTo: `deepFreeze` any function?

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

We can make a regulator function to create a regulated version of any input function like so:

```javascript
function freezeOutput(fun){
  return function(...args){
    return deepFreeze(fun(...args));
  }
}
```

## Demo: deepFreezeRegulator

```javascript
function freezeOutput(fun){
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

const makeFrozenObject = freezeOutput(makeObject);

const frozenAsAPopsicle = makeFrozenObject('hello', 'sunshine');
frozenAsAPopsicle.hello = 'rain';
console.log(frozenAsAPopsicle.hello); // => sunshine
```

## References

* 