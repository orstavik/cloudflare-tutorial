#  HowTo: make unique ids using durable objects? 

## What is durable objects?

Durable objects is cloudflare's solution for:
1. always consistent datastore and
2. 'singleton closures'.

## always consistent datastore

An always consistent datastore is:
1. exists only one at a time in the whole world.
2. it can move around between physical servers, but has only one logical address.
3. enables the developer to be certain that every requests gets a consistent, up-to-date view of the database.

A challenge with durable objects is that they can process multiple requests in parallel. This means that if you do an await-operation inside a durable object, other requests will likely sneak in and do a different operation before your whole fetch request has finished. This enables the durable object to for example:
 1. not wait for a big, slow write request to finish before it dispatches another read operation that is not affected, but
 2. could cause the database to be updated by another request while the transaction of the first request is only half done. 
 
## singleton function

Durable objects essentially function as a singleton worker. They have slightly different syntax, but they both react to fetch events.

Durable objects as singleton workers will have one in-memory closure react to all requests. This means that you can be certain that it only has one in-memory version of any variable you store in its scope. And this means that from the fetch listener, you can trust on the consistency of the js, in-memory, global variables.

This enables Durable objects to be used for managing web socket connections. 

## HowTo: write a Durable Object?

A durable object is written as part of a worker. Ie. you must write a new worker (or update an existing worker), every time you make a durable object.

A durable object has its own key-value-like storage unit that it gets. This key-value-like datastore is private to the durable object.

One workers durable object can be accessed from another worker if that second worker has the ID address of the first worker.  I assume that the worker holding the durable object must be active for this to be the case, if the first worker is deactivated or deleted, then its durable object seizes to be active i assume. Todo check this out?? todo 

When you write durable objects, you must use the updated import/export/.mjs syntax. This will apply to both the worker and the durable object, although the worker might not be affected.

Basic structure:
1. the durable object is a js class with:
   1. `constructor(state, env)`
      * `state.storage`
      * `state`._metadata_of_some_kinds)
      * `env` all the Global variables of the worker.
   2. method `async fetch(request){...`
      * a callback function that is triggered everytime the global object is accessed.
      
2. the worker is a shaped like a regular worker, and it must get hold of the durable object using a global variable.

## Demo: base62 unique counter

First, we look at the durable object.

```javascript
const base62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
function plusOne(numStr){
  const nums = numStr.split().map(s => base62.indexOf(s));
  nums[nums.length - 1] += 1;
  for (let i = nums.length - 1; i > 0  && nums[i] === 62; i--) {
      nums[i] = 0;
      nums[i - 1] += 1;
  }
  if (nums[0] === 62){
    nums[0] = 0;
    nums.unshift(1);
  }
  return nums.map(i => base62[i]).join('');
}

//durable object
class Base62Counter {
  constructor(state, env){
    this.storage = state.storage;
  }

  async init(){
    if (this.value === undefined)
      this.value = await this.storage.get('value');
  }

  async fetch(request){
    //1. we ensure that the in-memory property is updated.
    await init();
    //2. we update the in-memory property. This is sync, so no fetch-interwoven-async-differences
    this.value = plusOne(this.value);
    //3. we update the storage, in case the durable object worker is taken down. 
    this.storage.set('value', this.value);
    //4. return the new value
    return this.value;          
  }
}
```  

Second, we look at the worker calling the durable worker.

```javascript
export default {
  async fetch(req, env){
    return handleRequest(req, env);
  }
}

async function handleRequest(req, env){
  const id = env.Base62Counter.getIdFromName('A');
  const durObj = env.Base62Counter.getFromId(id);
  const resp = await durObj.fetch(req);
  const nextCount = await resp.text();
  return new Response('omg, this is counting.. '+nextCount);
}
```

## Convert number to base62

```javascript
Number.prototype.toBase = function (base) {
    var symbols = 
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    var decimal = this;
    var conversion = "";

    if (base > symbols.length || base <= 1) {
        return false;
    }

    while (decimal >= 1) {
        conversion = symbols[(decimal - (base * Math.floor(decimal / base)))] + 
                     conversion;
        decimal = Math.floor(decimal / base);
    }

    return (base < 11) ? parseInt(conversion) : conversion;
}

var n = 123456;
n.toBase(62);//w7e              
n.toString(36);//2n9c
```
[https://stackoverflow.com/questions/2557501/convert-a-number-to-the-shortest-possible-character-string-while-retaining-uniqu](https://stackoverflow.com/questions/2557501/convert-a-number-to-the-shortest-possible-character-string-while-retaining-uniqu)