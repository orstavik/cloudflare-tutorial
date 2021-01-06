# WhatIs: `cf-request-id`?

When Cloudflare receives an HTTP request, it assigns two unique ids to the incoming request *before* it passes it to a worker: `cf-request-id` and `cf-ray`.

## `cf-request-id`

The unique `cf-request-id` consists of:
1. timestamp (relative to Jan. 1 2020 00:00:00) 
2. workerID 
3. smallish counter (or maybe random number?)
4. padding (?)

```javascript
function cfRequestId(req) {
  const id = req.headers.get('cf-request-id');
  return !id ? [,,,] : [id.substr(0, 10), id.substr(10, 8), id.substr(18, 5), id.substr(23)];
}
```

With UnixTime timestamp relative to 1.1.1970:

```javascript
function cfRequestId(req) {
  const id = req.headers.get('cf-request-id');
  return !id ? [,,,] : [
    parseInt(id.substr(0, 10), 16) + 1580515200000, //Date.UTC(2020, 1, 1) === 1580515200000 
    id.substr(10, 8), 
    id.substr(18, 5), 
    id.substr(23)
  ];
}
```

## Test to identify the workerId in `cf-request-id`?

To spot the timestamp in the `cf-request-id` is simple. But how can we spot the `workerId`? This requires some interesting reverse engineering.

If we fire 15 `curl` requests to the same worker more or less at the same time, then Cloudflare will mostly create new workers to fulfill the task. However, not always. Sometimes Cloudflare reuses its workers.

Thus, if we create a worker with a simple counter that returns the different parts of the `cf-request-id`, then we can see which worker instances are new, and which ones are being reused. In this case, we should see the counter increment in the reused worker instances and the counter start from scratch in the new worker instances. And, this might give us a pattern we can use:

```javascript
function cfRequestId(cfri){
  return [cfri?.substr(0,10), cfri?.substr(10,8), cfri?.substr(18,5), cfri?.substr(23)];
}

let counter = 0;

async function handleRequest(request) {
  const cfri = cfRequestId(request.headers.get('cf-request-id'));
  cfri.push(counter++);
  return new Response(cfri.join(', ') + '\n');
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

We then send 15 more or less simultaneous `curl` requests to this worker:

`for i in {1..15}; do curl https://new-workers-are-clones.intertext-no.workers.dev/; done`

resulting in:

```
timestamp , workerid, random?, padding, count, //comment
--------------------------------------------------------------------
077988a9b3, 0000f142, 18308, 000000001, 0
077988b14b, 0000f15e, 7ab93, 000000001, 0      //instance f15e #1
077988b1ac, 000016a5, 281b3, 000000001, 0
077988b203, 00001669, ff16d, 000000001, 0      //instance 1669 #1
077988b26c, 00001665, 1c256, 000000001, 0
077988b2c1, 000015f8, b69a7, 000000001, 0
077988b312, 0000cadc, bc0a5, 000000001, 0
077988b387, 000015f0, 6103c, 000000001, 0
077988b3d9, 0000cb0c, e3369, 000000001, 0
077988b448, 00000d36, 81ada, 000000001, 0
077988b499, 00001669, ac8e6, 000000001, 1      //instance 1669 #2
077988b4ed, 000015fc, 1d067, 000000001, 0
077988b53b, 00000d46, 023c3, 000000001, 0
077988b594, 0000cb04, 2e90e, 000000001, 0
077988b5ee, 0000f15e, 652bb, 000000001, 1      //instance f15e #2
```

## References

 * dunno yet