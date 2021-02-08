# HowTo: CORS cookies

CORS requests often require to send a cookie to another domain. In simple requests, the browser automatically adds the cookies to the `Cookie` header of request, but CORS blocks such browser action. To successfully receive and send a cookie for a CORS requests, it is necessary to allow the browser to define the `cookie` header.

To do this, the response must include next headers:
* `Access-Control-Allow-Origin: "..."`
* `Access-Control-Allow-Credentials: true`

```js
async function handleRequest(request) {
  const headers = {
    "Access-Control-Allow-Origin": "https://prefligth-test-b.maksgalochkin2.workers.dev", // specify allowed domain to respond
    "Access-Control-Allow-Credentials": true,
  }
  let cookie = request.headers.get("cookie");
  return new Response(JSON.stringify({ cookies: cookie}), { headers: headers });
}

addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request))
});
```

Request must include `credentials: 'include'` option.

```js
async function handleRequest(req){

const headers = {"Content-Type": "text/html"};

const layout = `
<input type="text">
<script>
document.querySelector("input").addEventListener("click",  async e=>{
 const linkA = "https://prefligth-test-a.maksgalochkin2.workers.dev";
 const options = {method: "POST", body: data, credentials: 'include' };
 const request = await fetch(linkA, options).then(data=>data.text()).then(res=> res);
});
</script>
`
return new Response(layout, {headers: headers});
}


addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request))
});
```
# Reference

* [WhatIs: cookie](https://github.com/Halochkin/Cloudflare/blob/master/Auth/doc/WhatIs_cookie.md)
