# Why: fail `404`?

This article argues for using `status: 404` code for `errors`.

## 1. The browser doesn't treat `2xx` and `4xx`/`5xx` the same

The browser will pass all `2xx`, `4xx`, and `5xx` straight through to any script doing a `fetch(..)` request, as if there were no difference between them. If you try to navigate to an `html` or `txt` page, the browser will show the result from both `2xx`, `4xx`, and `5xx` to the user, again as if there was no difference.

However, the browser treats `2xx`, `4xx`, and `5xx` responses differently when they originate from an html element such as `<img src="...">`, `<link rel="style" href="...">`, `<script src="...">`, etc. In these instances, if the response `status` is anything but `2xx`, the browser will not show the result.

> web components that load external resources should check the `status` of the response first before trying to use the result.

## 2. your server-side is a village `500` strong

Your server-side function or app does not run in isolation on the server. On the contrary, your app runs together with: an OS, a runtime interpreter such as `php` or `node`, some network routers, apps controlling billing and availability in your PAAS, etc.

The other server-side systems can in various situations return `5xx` responses: if your `php` or `js` script has a syntax error, the interpreter might respond `5xx`; and, if you havn't payed your PAAS pal enough money, they respond `5xx: some quota exceeded`.

Neither the OS, interpreter, PAAS, nor any other server-side village member can anticipate the `content-type` your client-side script was hoping for. Therefore, they respond `5xx`  with a `content-type` as either `text/plain` or `text/html`.

> It is a good idea to *reserve* `5xx` error codes that other server-side actors use, and *not* use the same `5xx` errors in your server-side web application, but instead find other `5xx` error codes that you are certain enough should not be produced by other server-side actors. If you do this, then looking at the `5xx` error codes in the log will give you a good idea about where the error originated.

## 3. There is no simplicity to be found

Client-side, your app must relate to `status: 5xx` codes. And, if you are making requests in a script as part of a custom element of some kind, then the convention is to let the `status` code have the first say (and final say in the case of errors). Your client-side scripts must therefore check the `status` of the response *before* it parses or tries to use the response body.

When `5xx` errors *must be* processed differently by the browser client, it is more consistent and makes more sense to also tag other errors as `4xx`/`5xx` and "not ok".

## 4. `status` codes in logging is great

The `status` codes provide a simple means to highlight in your log the priority of the log entry. `status: 4xx` has high priority, cf. the red text produced by `console.error`, while `status: 2xx` is normal.

But. Be sure to get your ducks in a row when handling error `status` codes. For example, you can deliver `403 Forbidden` and not lie and call the error `404`. However, to do so require you to *only* deliver the `403` error code based on the content of the request and *not* based on the state. As soon as you start checking state that reside server-side, I recommend that from that point on, you only provide a single error code `404`. For example, if you by only matching the request `path` and a `cookie` supplied with the request can verify that the request does not have access, then the difference between `403` and `404` does not leak any secret information. However, if you check if a resource exists *first(!)*, and only afterwards check if the request has access, ie. you produce a `404` *before* you produce a `403`, then an attacker will know that `403` implicitly means the resource also exists. So in this example, duck `403` should never be dispatched after duck `404`.

## HowTo: `throw Error404`?

The categories of the HTTP `status` codes reach deep into application structure. And they are quite nuanced and informative. So, instead of giving custom error messages out, why not reflect the external fail structure in? Why not for example add a `.status: 403` to errors inside your servers code?

* `403 Forbidden` will be a suitable name for the type of `Error` thrown inside a server application when the request fails due to authentication errors.

```javascript
class Error403 extends Error {
  constructor(msg) {
    super(msg);
    this.status = 403;
  }
}

function handleRequest(req) {
  throw new Error403('I am not an open service');
  return new Response('This will never happen.');
}

addEventListener("fetch", function (e) {
  const request = e.request;
  let response;
  try {
    response = handleRequest(request);
  } catch (err) {
    const key = makeKey(request);
    KV_ERROR.put(key, {request, err});
    response = new Response('hide your messages here maybe? and errorid: ' + key, {status: err.status});
  } finally {
    e.respondWith(response); //when there is a bug, we don't mind the user bugging us wait 40ms for the response. Unless it is a bot, then we don't want that bot to wait. 
  }
});
```

## Refence

