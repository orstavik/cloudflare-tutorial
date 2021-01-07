# WhatIs: WorkerGlobalScope?

The WorkerGlobalScope is a worker's equivalent of the `window` object. The WorkerGlobalScope can be referenced as `self` in a worker. This means that anywhere in a worker script running `console.log(self.console === console))` prints `true`.

> `self` is also an alias for `window` in modern browsers, so `console.log(self.console === console))` will print `true` anywhere in the browser too.  

## Demo: `worker-that-counts`

Cloudflare will keep a worker alive an in its server memory between requests. This means that variables stored in the WorkerGlobalScope can be reused between different `fetch` events. We can use this to implement a WorkerThatCounts.

```javascript
let counter = 0;

function handleRequest(req){
  return new Response(counter++);
} 

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

If you load this worker several times, you will see the count increment. [https://worker-that-counts.intertext-no.workers.dev/](https://worker-that-counts.intertext-no.workers.dev/).

Att!
1. When your counter increments twice between visits, this is likely caused by your browser sending a request for `favicon.ico`.
2. Cloudflare will keep the worker alive for several days, maybe weeks. This means that the same worker might have been visited by another person in the past, and therefore that the counter starts at something other than 0. A worker is stopped and started when:
   1. you change the script,  
   2. you change an environment variable, or
   3. Cloudflare server needs the space or thinks it is about time. 

## Demo: worker concurrency

To respond *quickly* to requests to the same worker coming from different locations around the world, Cloudflare will run a new instance of the same worker script on each server/POP spread out around the world. This is called "edge computing", and yields super performance (think 25ms responsetime *anywhere in the world*!!). We love that. Go Cloudflare!

But. The WorkerGlobalScope is connected to the worker *instance*, and not the worker script. This means that when different instances of "the same" worker exists and respond to different requests at the same time, the *state* of the WorkerGlobalScope and the global variables it holds may not be the same for each worker.

For example, if we a) run the `worker-that-counts` on cloudflare's servers, and then b) access this worker from different locations around the world, then c) there will be different workers responding to that request at different locations, and therefore d) the counts will run in parallell and is not synchronized. 

To see this in action we simply need to open [https://worker-that-counts.intertext-no.workers.dev/](https://worker-that-counts.intertext-no.workers.dev/) from several different locations around the world using a service such as [geopeeker.com](https://geopeeker.com). And to make the count visible in geopeek.com, we increase the font-size of the `worker-that-counts`.

```javascript
let counter = 0;

function handleRequest(req){
  return new Response(
    `<p style='font-size: 75px'>${counter++}</p>\n`,
    {headers:{'content-type':'text/html'}}
  );
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

Att!
1. Cloudflare has several servers POPs available from most of these locations, and so you are not unlikely to see the count start at `0` mulitple times. However, seeing the count start at zero demonstrates the concept of different workers being instantiated.

## Same server worker concurrency 

Cloudflare's policy for creating multiple worker instances on the same server/POP is not explicitly defined. This is likely due to the fact that Cloudflare might very well frequently change these policies as part of their ongoing development of the workers platform.

However, at the end of 2020, their strategy seem to be as follows:
1. Requests sent from browsers are reused whenever possible. This makes sense, because requests from browsers rarely come in bulks and so rapidly as to cause traffic jams for a single worker/small group of workers.
2. Requests Cloudflare suspects coming from a bot of some kind are likely to spawn new workers *immediately*. This makes sense, because `googlebot` and it's like are likely to send many, many requests *fast* to Cloudflare's servers, and so Cloudflare' in-advance-guesstimate is that it now and in the near future will need many, many worker instances.
3. Thus, for these simple test-application purposes, I suspect that Cloudflare's algorithm primarily responds to the `user-agent` (and/or other request header properties such as cookies) to identify requests coming from browsers and requests coming from bots. Based on this information it then either queues the request to an existing worker, or spawns a new worker.

To see this in action, we send 15 requests in quick succession / parallel to our `worker-that-counts` using *two* different methods: `curl` / `devtools`.  

### `curl`

`for i in {1..15}; do curl https://worker-that-counts.intertext-no.workers.dev/; done`
//TODO the curl seems to run sequentially. the devtools approach runs them in parallel. 

This produces a long list of `0`s. With maybe one or two `1`s interspersed for good measure.

### Devtools

To run this test, do:
1. open [https://worker-that-counts.intertext-no.workers.dev/]('https://worker-that-counts.intertext-no.workers.dev/') in a browser.
2. open devtools.
3. open the `Network` tab.
4. In the console below, paste the following javascript:
```javascript
[...Array(15)].map(()=>fetch('https://worker-that-counts.intertext-no.workers.dev/'));
```

Expect the result to be a count from n to n+15, but in random order. Due to varying network latency, the requests sent from your browser does not necessarily reach Cloudflare's server in the sequence that devtools lists.

## References

 *