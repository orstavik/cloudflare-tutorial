# HowTo: `waitUntil(..)`?

> All good things come to those who wait. Remember that.

## WhenDoes: the `fetch` event lifecycle end?

By default, a `fetch` event's lifecycle ends when either a) `.respondWith(..)` resolves to a `Response` or b) the ImplicitResponse is triggered.

When the `fetch` event ends, the Cloudflare workers run-time will kill and remove all remaining tasks in the event loop that was queued from within a particular `fetch` event (here: FetchEventCleanUp). The FetchEventCleanUp helps Cloudflare preserve memory, network and computing resources, as these async tasks lingering in the event loop can no longer influence the returned `Response`.

> The FetchEventCleanUp only removes async tasks from the event loop; async tasks in the microtask queue are still run.

But. A worker can very well have important tasks that a) do not influence the `Response` sent back to the web client and b) that might take time and require tasks being queued in the event loop. Two prominent examples of such tasks are:
1. **Log**: Analyze `Request` and `Response` pairs and then log the results to an external log service.
2. **Caching**: Cache `Request` and `Response` pairs in memory and/or on disc to speed up later requests.

Now, the worker would like to *begin* these tasks *after* the `Response` has been made because a) the user appreciate fast responses, and b) these tasks often require the `Response` itself as input, and c) they do not influence the `Response` sent back to the user.

This, of course, comes into conflict with the FetchEventCleanUp at the default end-of-life of workers. And to avoid these peripheral, but important tasks from being killed and removed, the worker adds a method `e.waitUntil(..)` to *extend the end of life for a `fetch` event*. 
`e.waitUntil(..)` accepts a `Promise`, and can be called multiple times. 

## Demo: WaitForIt

```javascript
async function waitForIt(i){
  await new Promise(r=>setTimeout(r,i)); //sleep i ms 
  console.log(i);                        //print i
}

addEventListener('fetch', function(e){
  //you can comment out the e.respondWith(..) to test that 
  //e.waitUntil(..) also works for ImplicitResponses
  e.respondWith(new Response('hello sunshine', {status: 200}));
  for (let i = 0; i <= 2000; i+=50){
    const macroTask = waitForIt(i);
    //if you comment out the line below, nothing will be printed.
    e.waitUntil(macroTask);
  }
});
```

## References