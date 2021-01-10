# WhatIs: the `FetchEvent` lifecycle?

The beginning of life is simple: a life enters the world, free and innocent. But, living life often adds complexity: individual lives intertwine, and unexpected events, delays and responsibilities shapes life. Then, finally, end of life is often fraught with drama: life ends before the task of living is complete; the timely death sought might be delayed or come too soon. So it is with the life of `FetchEvent`s.

## Start of life: simple

Coarsely, the life of a `FetchEvent` begins with a request and ends with a response. And from the start, this remains true. A `FetchEvent`s lifecycle begins when it is dispatched to an event listener function registered to a worker. The `FetchEvent` includes a `.request` property, and we are up and running.

## Mid life: `FetchEvent` processes overlap

Often one worker handles multiple subsequent requests. We can imagine this as a queue:

1. request A is sent into worker 1, worker 1 process request A, and returns a response A;
2. request B is sent into worker 1, worker 1 process request B, and returns a response B;
3. request C is sent into worker 1, worker 1 process request C, and returns a response C;
4. etc.

But. What happens if the worker needs to wait for some other service during the production of the response; what if worker 1 must standby while it fetches a web request in order to process request A? Is request B and request C then put on hold, ie. does worker 1 delay ensuing requests? Or can worker 1 start processing request B and request C while it waits for external, async tasks init needs to continue to process request A, ie. can worker 1 process overlapping events?

The answer is that the worker can process overlapping events. And this means that while the worker waits for an async operation in the middle of processing one fetch event, the same worker instance can start processing another fetch event. And this can complicate the use of global variables stored in the WorkerGlobalScope, which will span all overlapping `FetchEvent`s.

## Demo: `overlapping-fetch-events`

In this demo, we illustrate how `FetchEvent` processes overlap.

```javascript
function cfRequestId(cfri) {
  return [cfri?.substr(0, 10), cfri?.substr(10, 8), cfri?.substr(18, 5), cfri?.substr(23)];
}

let counter = 0;

async function handleRequest(request) {
  const res = cfRequestId(request.headers.get('cf-request-id'));
  res.push(counter++);                        //#1
  await new Promise(r => setTimeout(r, Math.random()*2000)); //sleep upto 2 seconds
  res.push(counter++);                        //#2
  return new Response(res.join(', ') + '\n');
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

We open 10 pages ~simultaneously~ using devtools:
1. Open `Network` tab in `devtools`.
2. In the `console`, paste:
```javascript
[...Array(10)].map(()=>fetch('https://fetch-event-in-parallel.intertext-no.workers.dev/'))
```

Which produce the following results.
```
 timestamp, workerId, randm,   padding, #1, #2
----------------------------------------------
077a3d7744, 000015e0, e4a28, 000000001, 18, 31
077a3d774a, 000015e0, d2b88, 000000001, 26, 28 //see 1 below
077a3d774b, 000015e0, e51db, 000000001, 19, 36 //see 2 below
077a3d7751, 000015e0, ba0b6, 000000001, 22, 33
077a3d7752, 000015e0, b2067, 000000001, 20, 32
077a3d7755, 000015e0, 7e27b, 000000001, 27, 35 //see 1 below
077a3d7756, 000015e0, e1087, 000000001, 21, 37 
077a3d7759, 000015e0, adbd5, 000000001, 25, 34
077a3d7756, 000015e0, 87144, 000000001, 24, 30
077a3d7757, 000015e0, 91958, 000000001, 23, 29
```
1. Started on count 26, then incremented to 27, and waited for the async sleep process. Then one other fetch event was started on count 27, and incremented the counter to 28, and then went to sleep. Then the worker continued on processing the first fetch event (count 26) and completed it on count 28.
2. The fetch event that started on count 27 slept while approx. 8 other fetch events (36-(19+1) = 16 = 8*2) has been processed while this fetch event was placed on standby.

## The end 1: normal ResponseTime

By default, the `FetchEvent` will end when a `Response` is passed to `fetchEvent.respondWith(..)`. We can call this time ResponseTime. At ResponseTime (see 1. below), the Javascript runtime environment will complete the current task (2.), including tasks already queued and that will be queued in the microtask queue(3.). At ResponseTime, the Cloudflare run-time will also **silently** remove any event loop tasks triggered by this specific `FetchEvent` listener (see 4.).

```javascript
addEventListener('fetch', e => {

  console.log('same task before');                         //current task
  Promise.resolve().then(()=>console.log('micro before')); //Microtask
  setTimeout(()=>console.log('event loop before'));        //Event loop task

  e.respondWith(new Response('hello Sunshine'));           //ResponseTime

  console.log('same task after');                          //current task
  Promise.resolve().then(()=>console.log('micro after'));  //Microtask
  setTimeout(()=>console.log('event loop before'));        //Event loop task
});
```

Prints:
```
same task before
same task after
micro before
micro after
```

## The end 2: `Promise` vs. *true* ResponseTime

However, most often the `FetchEvent.respondWith(..)` receives a `Promise`. The worker performs an async request to the KV store, the worker performs an async `fetch` to a resource from another server, the worker has passed the request to the Cloudflare CDN, etc. etc. This means that most of the time, the time you call `respondWith(..)`, it is not the *true* ResponseTime, but a `Promise` ResponseTime that will some time later turn into the *true* ResponseTime.

```javascript
async function handleRequest(req){
  const upto9 = Math.random()*9;
  await new Promise(r=>setTimeout(r, upto9));
  return new Response('hello Sunshine ' + upto9); 
}

addEventListener('fetch', e => {
  setTimeout(()=>console.log('zero'), 0);
  setTimeout(()=>console.log('one'), 1);
  setTimeout(()=>console.log('two'), 2);
  setTimeout(()=>console.log('three'), 3);
  setTimeout(()=>console.log('four'), 4);
  setTimeout(()=>console.log('five'), 5);
  setTimeout(()=>console.log('six'), 6);
  setTimeout(()=>console.log('seven'), 7);
  setTimeout(()=>console.log('eight'), 8);
  setTimeout(()=>console.log('nine'), 9);
  e.respondWith(handleRequest(e.request));
});
```

## The end 3: implicit `Response`

Cloudflare workers are built to run in front of the Cloudflare CDN. If the worker does not produce a Response **immediately**, then Cloudflare will pass the request over to the CDN instead as if there were no worker there (the documentation says "the runtime proxies the request to the origin").

This routing from the cloudflare worker to the cloudflare CDN (origin) works *as if* Cloudflare automatically appends the following snippet to the end of every worker script:

```javascript
addEventListener('fetch', function (fetchEvent){
  fetchEvent.respondWith(nativeProxyToTheOriginFunction(fetchEvent.request));
});
```

This is the technical reason why `fetchEvent.respondWith(..)` must be called *sync* during an event listener, because the `fetchEvent` listeners are executed synchronously by the cloudflare runtime.

The CDN will return a `Promise` to the Cloudflare worker that will resolve into a `Response`. Cloudflare will not cleanup the tasks in the event loop until this `Promise` is resolved into a `Response`. This causes a problem as you the developer might sometimes see tasks you await being performed, and sometimes not.  

## Problem: CleanupBomb

Most of the time your worker produces a `Promise` ResponseTime, it waits for some kind of web resource that takes anywhere from 25ms to several seconds to resolve. Lets imagine an example:

You are making a worker that forwards files from a database server, and then logs each request. When you are developing the worker, you are located quite far away from the server, and so the duration between the `Promise` ResponseTime and the *true* ResponseTime is consistently 60ms+. You then pass the `Promise` to `respondWith()`, and then afterwards log the request with a roundtrip to the KV store that takes ~40ms. You never get any problems during development here, because your development environment is consistently 60ms+ away from the database server. Then you go into production. And a bunch of users are located near a Cloudflare POP that is much nearer your database server, and which therefore will **sometimes** have duration between the `Promise` ResponseTime and the *true* ResponseTime of ~30ms. Which **sometimes** will therefore break your connection with the KV store. Ka-Boooom!

## The end 4: `waitUntil(..)`

To control the CleanupBomb, you must ensure that all async operations that are independent of the production of the `Response` are registered so that they don't get cleaned up by the Cloudflare runtime. You do this by calling the `FetchEvent.waitUntil(..)` method.

```javascript
async function handleRequest(req){
  const upto9 = Math.random()*9;
  await new Promise(r=>setTimeout(r, upto9));
  return new Response('hello Sunshine ' + upto9); 
}

async function andAone(str, int){
  await new Promise(r=>setTimeout(r, int));
  console.log(str);
}

addEventListener('fetch', e => {
  e.waitUntil(andAone())
  e.waitUntil(andAone('zero', 0));
  e.waitUntil(andAone('one', 1));
  e.waitUntil(andAone('two', 2));
  e.waitUntil(andAone('three', 3));
  e.waitUntil(andAone('four', 4));
  e.waitUntil(andAone('five', 5));
  e.waitUntil(andAone('six', 6));
  e.waitUntil(andAone('seven', 7));
  e.waitUntil(andAone('eight', 8));
  e.waitUntil(andAone('nine', 9));
  e.respondWith(handleRequest(e.request));
});
```



Why? Why must `respondWith(..)` be called synchronically?

Well, the rational is a bit complex, but here goes:
1. The lexical scope of the FetchEventContext is the same as the WorkerGlobalScope. This means that the `FetchEvent` can and sometimes are associated with variables in this global context.
2. FetchEventContexts can and do overlap (see below). This means that it is possible for one function listening for `fetchEvent`s to get access to another `fetchEvent` object. Thus, in theory, a function triggered by one `fetchEvent` therefore could access another `fetchEvent` object via the WorkerGlobalScope and then provide it with a `Response`.
3. This logic of enabling a function triggered by one `fetchEvent` to dispatch a Response to another `fetchEvent` is to be discouraged. While still possible, the "founding fathers" or this part of the platform would like to strongly encourage us *not* to do so. So, how to implement such a restriction? How to ensure that the property `respondWith` on the `fetchEvent` is only called from within a possibly async function that is (in)directly triggered by a specific eventlistener callback?
4. What about a FetchEventScope? Ie. can we make a global variable that is only available within functions that are directly or indirectly triggered by a specific event listener call instance? Ie. can we in a function make a variable that is only accessible to subsequent calls in the callstack? Even when these calls are async queued in the microtask queue or the event loop? Unfortunately no. There are no means to implement dynamic scope in Javascript.
5. What we can do, however, is at the beginning of the eventListener callback for the `FetchEvent` add a microtask that will render the `respondWith` useless unless. This means that we can restrict access to the `FetchEvent.respondWith` to be the result of a function called sync from within the `fetchEvent` event listener. This is likely to lure the developer into consistently return a new response to a request *within* a FetchEventContext, while not really enforcing it.

The global `FetchEvent` listener must call `fetchEvent.respondWith(..)` with a `Response` object or a `Promise` of such an object **synchronically**.



## The end 2: `FetchEvent.waitUntil(Promise)`

## The end 3: Timeout30

Cloudflare will automatically


, 

This context is *not* the same as the WorkerGlobalScope, although one worker often exclusively control one WorkerGlobalScope during the lifetime of a FetchEventContext.

The global object of the FetchEventContext is the fetch `event` itself. This `event` contains the data that is unique to each FetchEventContext, such as the `request` as well as the `e.respondWith(..)` and `e.waitUntil(..)` methods.


## `e.respondWith(..)`

`e.respondWith(..)` is a method that channels a `Response` object to the underlying platform which will ship it over the network to its recipient. For any worker that wish to respond to requests, `e.respondWith(..)` is essential.

But. There is a snag with this method.  

When "the same" worker responds to two different requests from two different servers, it is in reality *two different instances* of the same worker *script* that is responding.

To see this in action, we need a worker script with a global variable counter that increments each time the worker responds to a request. When we access this worker script from the same geolocation, the counter increments:


and then access this worker script from around the globe . The worker script uses a


This means that you can always have many different workers responding to requests for the same resource around the world. And this in turn means that the state of the `ServiceWorkerGlobalScope` can vary during each handling of each request. Put simply, there are many instances of each worker running in different parts of the world at any time, and therefore the state of the global variables of each worker (the in-memory cache) will vary.

But. In addition to running a different instance at each POP, cloudflare will sometimes spawn *many* workers to run in parallel on *the same POP*. Here Cloudflare's behavior becomes a bit more nuanced. It seems that Cloudflare will spawn a new worker on the same POP if it thinks that the request comes from a crawler such as Googlebot, but it will try to avoid spawning new workers when it thinks the request comes from a browser.

## Test 1: same-POP concurrency in action

The below demo runs the following script concurrently:

```javascript
function cfRequestId(cfri) {
  return [cfri?.substr(0, 10), cfri?.substr(10, 8), cfri?.substr(18, 5), cfri?.substr(23)];
}

let counter = 0;

async function handleRequest(request) {
  const c = counter++;
  const cfri = cfRequestId(request.headers.get('cf-request-id'));
  return new Response(cfri.join(' : ') + ' | ' + c + '\n');
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

### Test 1a: the `curl` crawler bot

When we place 15 requests to a cloudflare worker with `curl`, cloudflare will spawn more than 10 different workers.

`for i in {1..15}; do curl https://new-workers-are-clones.intertext-no.workers.dev/; done`

This produces the following example result:

```
//worker 0000cae4 has already run once before this test, it is active on this POP
//timestamp: workerId : random: padding   | counterState
071bed74e1 : 00000d46 : 361d3 : 000000001 | 0      
071bed752d : 0000cae4 : d89b8 : 000000001 | 1      //worker 0000cae4 once 
071bed756e : 0000cae4 : e91da : 000000001 | 2      //worker 0000cae4 twice
071bed75af : 0000caf8 : 14a17 : 000000001 | 0        
071bed7609 : 0000f134 : e29e7 : 000000001 | 0 
071bed765f : 0000cadc : bd15b : 000000001 | 0
071bed76b5 : 0000f166 : 4c82b : 000000001 | 0      //worker 0000f166 once
071bed7701 : 0000cb00 : f8189 : 000000001 | 0      
071bed775c : 0000f166 : 87b89 : 000000001 | 1      //worker 0000f166 twice
071bed77a4 : 0000169d : df005 : 000000001 | 0      
071bed77f3 : 000015f8 : 90bfc : 000000001 | 0      
071bed7836 : 000015f4 : cbac4 : 000000001 | 0 
071bed7879 : 0000f162 : d38f2 : 000000001 | 0 
071bed78df : 0000cb08 : 7eb75 : 000000001 | 0 
071bed792c : 0000f210 : fa227 : 000000001 | 0      //all other workers are new instances
```

### Test 1b: the `curl` crawler bot

However, when we run a similar test via the browser, cloudflare don't spawn new worker instances.

```javascript
//1. open https://new-workers-are-clones.intertext-no.workers.dev/ in a browser
//2. open devtools->network tab
//3. open console within the network tab (esc)
//4. paste the following code in the console, and watch the responses in the network panel
(function () {
  [...Array(15)].map(async () => await (await fetch('https://new-workers-are-clones.intertext-no.workers.dev/')).text());
})();
```
This produce the following results:

```
071bfb32b8 : 0000f14a : 0fbb0 : 000000001 | 9   //the same worker 0000f14a runs for all requests
071bfb32b3 : 0000f14a : a3283 : 000000001 | 0   //the counter starts at 0, ends at 14
071bfb32b5 : 0000f14a : 183e1 : 000000001 | 8   
071bfb32b5 : 0000f14a : 04190 : 000000001 | 11   
071bfb32b6 : 0000f14a : b9117 : 000000001 | 10 
071bfb32b5 : 0000f14a : e6274 : 000000001 | 6 
071bfb32b6 : 0000f14a : 94b82 : 000000001 | 1 
071bfb32b6 : 0000f14a : ed8a8 : 000000001 | 7 
071bfb32b7 : 0000f14a : dfa16 : 000000001 | 3 
071bfb32b7 : 0000f14a : a6b0d : 000000001 | 5 
071bfb32b9 : 0000f14a : ce884 : 000000001 | 14 
071bfb32bd : 0000f14a : 9900e : 000000001 | 4 
071bfb32bd : 0000f14a : f49fb : 000000001 | 2 
071bfb32bc : 0000f14a : 04191 : 000000001 | 13 
071bfb32be : 0000f14a : 2e003 : 000000001 | 12 
```

## Test 2: Concurrency, async and delays

Often a worker needs to `await` an `async` operation in order to produce a `Response` from a `Request`/`FetchEvent`. When this happens, the same worker instance will process other `FetchEvents` while it waits for the other `async` operations to conclude. Ie. one worker might process several `FetchEvent`s in parallell/"at the same time". This has consequences for how you can expect global variables in the `ServiceWorkerGlobalScope` to behave.

```javascript
function cfRequestId(cfri) {
  return [cfri?.substr(0, 10), cfri?.substr(10, 8), cfri?.substr(18, 5), cfri?.substr(23)];
}

let counter = 0;

async function handleRequest(request) {
  const c = counter++;
  const cfri = cfRequestId(request.headers.get('cf-request-id'));
  await new Promise(r => setTimeout(r, Math.random()*1000+500)); //will await 500-1500ms
  const c2 = counter++;
  return new Response(cfri.join(' : ') + ' | ' + c + ' | ' + c2 + '\n');
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

We only test this in the browser, as this better illustrate the confusion:

```javascript
//1. open https://fetch-event-in-parallel.intertext-no.workers.dev/ in a browser
//2. open devtools->network tab
//3. open console within the network tab (esc)
//4. paste the following code in the console, and watch the responses in the network panel
(function () {
  async function getTest() {
    const resp = await fetch('https://fetch-event-in-parallel.intertext-no.workers.dev/');
    return await resp.text();
  }
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(async () => await getTest());
})();
```
This produce the following results:

```
071c0f0cf4 : 000010ad : 5e16e : 000000001 | 4 | 25  //worker 000010ad runs for all requests
071c0f0cf4 : 000010ad : 8c8e7 : 000000001 | 7 | 27  //the counter starts at 4, ends at 32
071c0f0cfa : 000010ad : 3fb56 : 000000001 | 5 | 29  
071c0f0cfa : 000010ad : 7fbbd : 000000001 | 6 | 21
071c0f0cff : 000010ad : 7e9c0 : 000000001 | 8 | 32  //24 other actions in other events
071c0f0d01 : 000010ad : 44061 : 000000001 | 9 | 20
071c0f0d07 : 000010ad : 6d30e : 000000001 | 10 | 19  //9 other actions in other events
071c0f0d0b : 000010ad : 3e1da : 000000001 | 11 | 26
071c0f0d10 : 000010ad : 9e9a8 : 000000001 | 12 | 22
071c0f0d11 : 000010ad : 43b3f : 000000001 | 13 | 33
071c0f0d1d : 000010ad : 862b7 : 000000001 | 15 | 24
071c0f0d1f : 000010ad : 97a31 : 000000001 | 14 | 23
071c0f0d29 : 000010ad : 9b2d0 : 000000001 | 18 | 28
071c0f0d29 : 000010ad : 5e172 : 000000001 | 16 | 30
071c0f0d2a : 000010ad : 6fa5c : 000000001 | 17 | 31
```

## References

* dunno yet

```javascript
addEventListener('fetch', async e => {
  try{
    console.log('bob');
    await new Promise(r=>setTimeout(r, 100));
    console.log('alice');
    //the respondWith are accepted inside the async event listener itself.
    //the original event listener is async, and 
    //the delay is caused by an await inside the async event listener.
    //then the response is produced by the default mechanism.
    //and there is no error in the first e.respondWith(..)
    e.respondWith(new Response('hello sunshine'));//you don't necessarily get an error message here? why?
    e.respondWith(new Response('hello sunshine'));
  } catch(err){
    console.log(err.message);
  }
});

```