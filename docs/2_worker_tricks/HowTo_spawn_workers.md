# WhatIs: worker concurrency?

Cloudflare will run workers in parallel on different POPs. This means that you can always have many different workers responding to requests for the same resource around the world. And this in turn means that the state of the `ServiceWorkerGlobalScope` can vary during each handling of each request. Put simply, there are many instances of each worker running in different parts of the world at any time, and therefore the state of the global variables of each worker (the in-memory cache) will vary.

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
  //let X = 0; new Array(1000000).fill(0).forEach(()=>X += 1);    //takes roughly 15ms
  //await new Promise(r => setTimeout(r, 1000));
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
  async function getTest() {
    const resp = await fetch('https://new-workers-are-clones.intertext-no.workers.dev/');
    return await resp.text();
  }
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(async () => await getTest());
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