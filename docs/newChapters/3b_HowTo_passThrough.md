# HowTo: passThrough?

When a worker receives request, it has the opportunity to pass the request to the underlying system. In a service worker, that would mean to let the browser try to fetch the resource on the web; in a cloudflare worker, that would mean to pass the request through to the CDN.

The implicit response (ie. not calling `e.respondWith(..)`) is one such method. The other method is to:

1. call `e.passThroughOnException()` and then
2. `throw Exception(..)` or simply not `catch` an already thrown exception.

There is one important nuance to `e.passThroughOnException()`: you can call it just-in-time. Unlike `e.respondWith(..)`, you do not have to call `e.passThroughOnException()` in the sync scope of the `fetch` event listener. See demo below.

## Demo: `FetchEvent.passThroughOnException(..)`

```javascript
  addEventListener('fetch', e => {
  // e.passThroughOnException();//the hope is that we don't need to do this until we really need to.
  e.respondWith(async function () {
    await new Promise(r => setTimeout(r, 50));
    e.passThroughOnException();
    throw new Error('omg, we see the fallback page, or what?');
  }());
});
```

## All together now

Because it is possible to call `e.passThroughOnException()` just-in-time, we can establish a pattern for handling CDN, "pass through" for a worker. We register a method that checks the incoming `Request` object and turns it into a `Response` object. If this method returns `undefined`, then this is a signal that the underlying CDN should handle the `Request`.

This can be achieved both sync, and async. Like this:

```javascript
async function makeResponse(req) {
  return new Response();
}

function handleRequest(req) {
  const response = makeResponse(req) || undefined;
  const observerPromises = [new Promise(r => setTimeout(r, 50)), new Promise(r => setTimeout(r, 100))];
  //the 
  return [response, observerPromises];
}

addEventListener("fetch", e => {
  let [response, observers] = handleRequest(req);
  observers && e.waitUntil(Promise.allSettled(observers));
  
  if (response === undefined)
    return;
  if (!(response instanceof Promise))
    return e.respondWith(response);
  e.respondWith(async function () {
    const result = await response;
    if (result === undefined){
      e.passThroughOnException();
      throw new Error('Passing request to CDN');
    }
    if (result instanceof Error)
      throw result;
    return result;
  }());
});
```

There are many things here worth noting:

1. This is a universal event listener. This event listener can essentially be reused for **all** workers. **All the time**.
2. The universal event listener handles all calls to `respondWith(..)`, `waitUntil(..)`, and `passThroughOnException(..)`. There will never be any reason to consider them again. As long as your `handleRequest(req)` method produce a response (promise) and an array of observer promises. 
3. The universal event listener tackles both sync and async `handleRequest(..)` functions equally well. There is no Promise delay if not necessary.
4. The conventions are as follows:
    1. if the `response` output from the `handleRequest(..)` is `undefined` or a `Promise` that resolves to `undefined`, then the `request` will `passThrought`. This is implemented by a) not calling `e.respondWith(..)` if the `response` is `undefined` from the get-go, and b) by calling `passThroughOnException()` just-in-time if the `response` `Promise` resolves to `undefined`.
    2. The list of `Promise`s that is the `observers` is always `awaitUntil`ed.
5. The `handleRequest(req)` thus needs to deliver two outputs: a `response` (or a `Promise` of a `Response`), and a list of `observer` `Promise`s. The `handleRequest(req)` is responsible for ensuring that the outputs are correct. If the `response` is an `Error`, then the worker will throw an `Error` as it normally does.   
