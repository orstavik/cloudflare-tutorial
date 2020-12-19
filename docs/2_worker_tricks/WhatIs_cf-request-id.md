# WhatIs: `cf-request-id`?

When Cloudflare receives an HTTP request, it assigns two unique ids to the incoming request *before* it passes it to a worker: `cf-request-id` and `cf-ray`.

## `cf-request-id`

The unique `cf-request-id` consists of:
1. a timestamp (that starts counting at midnight 1.1.2020), 
2. a workerID, and 
3. a smallish unique counter/id.

```javascript
function cfRequestId(req) {
  const id = req.headers.get('cf-request-id');
  return !id ? [,,,] : [id.substr(0, 10), id.substr(10, 8), id.substr(18, 5), id.substr(23)];
}
```

With corrected timestamp:

```javascript
function cfRequestId(req) {
  const id = req.headers.get('cf-request-id');
  return !id ? [,,,] : [id.substr(0, 10), id.substr(10, 8), id.substr(18, 5), id.substr(23)];
}

//2020 jan 1. 00:00:00  === Date.UTC(2020, 1, 1) === 1580515200000
function cfRequestIdTimestampCorrected(req){
  const res = cfRequestId(req);
  res[0] && (res[0] = parseInt(res[0], 16) + 1580515200000);
  return res;
}
```

## References

 * dunno yet