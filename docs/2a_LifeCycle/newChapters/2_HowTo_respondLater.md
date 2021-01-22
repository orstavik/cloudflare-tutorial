# HowTo: respond later?

Most often a worker cannot produce a `Response` right away. The worker might need to `fetch("https:an.external/web.resource")`, get something from a database, and/or `await` some other `async` function *before* it can produce a `Response`.

To solve this problem, the `e.respondWith(..)` can accept both a `Response` object and a `Promise` that will resolve into a `Response` object.

## Demo: what comes to those who wait?

```javascript
async function waitForIt() {
  await new Promise(r => setTimeout(r, 500));//sleep 500ms
  return 'good things';
}

addEventListener('fetch', function (e) {
  const promiseOfSomething = waitForIt();
  e.respondWith(promiseOfSomething);
});
```

## Problem 1: `e.respondWith(..)` must be called sync

In the previous chapter, we saw how the Cloudflare platform will invoke an ImplicitResponse if the worker does not call `e.respondWith(..)`. However, what we didn't mention is that **the Cloudflare platform will also invoke the ImplicitResponse if `e.respondWith(..)` is *not* called from the *sync* context of the `fetch` event listener function**. Thus, `e.respondWith(..)` must be called **sync** and deliver a `Promise`; you CANNOT run an **async** function that eventually will call `e.respondWith(..)`.

This **restriction that `e.respondWith(..)` must be called *sync*** is best exemplified as an example of what does not work:

```javascript
async function inVain(fetchEvent) {
  //fetchEvent.respondWith('good things'); 
  //it doesn't matter if you call respondWith(..) before the actual wait, 
  //as the async function itself is converted into a Promise. 
  await new Promise(r => setTimeout(r, 500));
  fetchEvent.respondWith('good things');//you cannot call .respondWith(..) inside async call
}

addEventListener('fetch', function (e) {
  inVain(e);
});
```

Why? Why must `e.respondWith(..)` be called *sync*? Well, by setting this restriction for `e.respondWith(..)`, the Cloudflare platform can make a decision very early on if it should begin fetching an alternative `Response` from the underlying Cloudflare CDN system. This means that the Cloudflare worker can begin fetching the CDN `Response` as quickly as possible and **avoid waiting** for other operations to finish in the worker. And this is beneficial, as anything the worker does *after* the decision to fetch the `Response` from the CDN will not influence the `Response` anyway. (And this is similarly true for other worker platforms such as web workers.)

## Problem 2: Missing RespondTooLateError

In the demo above, the `async function inVain(..)` tries to call `fetchEvent.respondWith(..)` even though the request has at that time already been sent to the Cloudflare CDN subsystem. Which essentially constitute an error: a "calling `e.respondWith(..)` too late" `Error`.

Hence. We have two problems:
1. the not-very-intuitive restriction that `e.respondWith(..)` must be called sync, and
2. the silent error that occurs when we try to call `e.respondWith(..)` async (too late).

## Solution: Polyfix ImplicitResponse and TooLateError 

However, it might be difficult even for seasoned developers to catch this nuance in their code. Thus, workers should at a minimum alert the developer that the ImplicitResponse has been invoked. To implement such an alert yourself, the following polyfix can be added (at the very beginning for your worker script).

```javascript
(function () {
  const eventHasBeenCalled = new WeakSet();

  const respondWithOG = FetchEvent.prototype.respondWith;
  Object.defineProperty(FetchEvent.prototype, 'respondWith', {
    value: function (...args) {
      eventHasBeenCalled.add(this);
      respondWithOG.call(this, ...args);
    }
  });
  const warning = 'The request has been delegated to the Cloudflare CDN. You can no longer call '
  addEventListener("fetch", e => Promise.resolve().then(
    () => eventHasBeenCalled.has(e) || console.warn(''))
  );
})();
```


## References