# HowTo: respond?

> Definintion: A web server is an application that gets an HTTP request, does something with it, and then *responds with* an HTTP response. A web client is an application that sends HTTP requests to web servers, gets HTTP responses back, and then does something with that response.  

## WhatIs: a Cloudflare worker?

Cloudflare workers is a JS platform to implement web servers. Each worker is essentially just a small javascript file, and each worker is registered under a URL such as `my-worker.my-project.workers.dev`. 

Every time an HTTP request is sent to a worker's URL, the Cloudflare platform:
1. converts the incoming HTTP request into a `fetch` event with a `.request` property, and then
2. dispatches this fetch event inside the worker.

The worker script can listen for such `fetch` events inside itself. Then whenever the Cloudflare platform dispatches a `fetch` event to the worker, this `fetch` event will trigger a function inside the worker.

To send a response back from the worker to the web client, the worker must call a special method called `respondWith(..)` on the `fetch` event.

## Demo: HelloSunshine

```javascript
const myResponses= {
  '/hello': 'sunshine',
  '/goodbye': 'my friend'
}

addEventListener('fetch', function(fetchEvent){
  const url = new URL(fetchEvent.request.url);
  const whatToReply = myResponses[url.pathname] || 'what do you mean by ' + url.pathname;
  fetchEvent.respondWith(new Response(whatToReply, {status: 200}));
});
```

## WhatIs: ImplicitResponse?

> Cloudflare run-time: try first workers, then CDN

**If a worker does not call `e.respondWith(..)`**, then "Cloudflare workers" will pass the request to "Cloudflare CDN" and let the CDN send a `Response` back to the web client. We can say that the worker is implicitly responding with the `Response` from the CDN when the worker itself does not produce a `Response` and pass it to `e.respondWith(..)`. 

## Demo: HelloWorld

```javascript
const myResponses= {
  '/hello': 'world',
  '/goodbye': 'my friend'
}

addEventListener('fetch', function(fetchEvent){
  const url = new URL(fetchEvent.request.url);
  const whatToReply = myResponses[url.pathname];
  if(whatToReply)
    fetchEvent.respondWith(new Response(whatToReply, {status: 200}));
  // else
    // let the CDN part of the Cloudflare platform handle the request.
});
```

If this worker is registered to `example.com`, then:
```
https://example.com/hello => 'world'
https://example.com/goodbye => 'my friend'
https://example.com/help.html => *the CDN part of the Cloudflare platform tries to find a help.html file*
```

> 'Silence is golden' is a bullshit expression.

## Detail: `e.respondWith(..)` only once

You can only call `e.respondWith(..)` once. If you try to call it again with a new value, then the second call will `throw` an `Error`.

## References