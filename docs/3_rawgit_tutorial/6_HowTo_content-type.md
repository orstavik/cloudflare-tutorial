# HowTo: `content-type`?

## 1. use the same `content-type` for similar requests

For all requests of the same type. A response should never change its content type based on the server succeeding or failing in processing the request, for example.

It is not a problem if the same server program delivers a different content-type for different `pathname`s for example, as long as it always does so consistently for all requests to that path.

## 2. use both `content-type` and `X-Content-Type-Options: nosniff`

If the server knows the `content-type` for its response, the server should specify both `content-type` and `X-Content-Type-Options: nosniff`. `nosniff` is especially important when a  user can upload their own content on the server.


## Refence

* [MDN: `X-Content-Type-Options: nosniff`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options)
* [XSLeak using `status` and `content-type`](https://medium.com/bugbountywriteup/cross-site-content-and-status-types-leakage-ef2dab0a492)
* [HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)