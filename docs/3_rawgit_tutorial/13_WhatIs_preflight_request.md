# WhatIs: simple and preflight request? 

Many of us have encountered a similar error:

> Access to XMLHttpRequest at 'https://abc.xyz' from origin 'https://def.xyz' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource...

This article explains what this error means and how to get rid of it. But first let's understand the types of requests

The CORS standard distinguishes between "simple" and "complex" requests. 

## Simple requests

A simple requests using next methods:

* `HEAD`
* `GET`
* `POST`
 
 And HTTP headers:

* `Accept`
* `Accept-Language`
* `Content-Language`
* `Last-Event-ID`
* `Content-Type` with next values:
    * application/x-www-form-urlencoded
    * multipart/form-data
    * text/plain
    
If request meets these criteria, it is possible to send request to another domain from any modern browser. In doing so, the browser will add an `Origin` header with the address of the page from which the request has been initiated. 
> `Origin` header cannot be tampered with by the script.

The server, having received such a request for processing, has to read `Origin` header and decide how to handle it. 
The `Access-Control-Allow-Origin` response header regulates from which domain it is allowed to request data. It can be either particular web address (https://example.com) or everyone (*) is allowed. 

Let`s consider example of simple POST request. WorkerA respond to POST request. "Access-Control-Allow-Origin" header defines origin of requests and allows worker to respond. 

## Simple request example

Let's look at an example of a simple POST request using workerA and workerB. 
WorkerA responds to the POST request made by WorkerB.

### Worker A
```js
async function handleRequest(request){
 const headers = {
    "Access-Control-Allow-Origin" : "https://test-b.maksgalochkin2.workers.dev", // specify allowed domain to respond
    "Content-Type": 'application/json',  //specify input data mime type
} 
   if(request.method !== "POST")  // post request filter
    return;
   let data = await request.json(); 
   data.answer = "42";
   return new Response(JSON.stringify(data), {headers: headers});
}

addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request))
});
```
In order for workerA to be able to respond to workerB's request, an `Access-Control-Allow-Origin` header is defined with a value equal workerB url address.
The `Content-Type` header specifies the mime type of the data used as the response.

> WorkerB can't make a request to workerA directly from server side, so it returns a html with script that makes a POST request from the client side (in the browser).
>
### Worker B

```js
async function handleRequest(req){

const headers = {"Content-Type": "text/html"};

const script = `<script>
(async ()=>{
 const msg = {question: "Answer to the Ultimate Question of Life, the Universe, and Everything"};
 const linkA = "https://test-a.maksgalochkin2.workers.dev";
 const options = {method: "POST", body: JSON.stringify(msg)};
 const request = await fetch(linkA, options).then(data=>data.json()).then(res=> res);
 document.body.textContent = msg.question + " is " + request.answer;
})()
</script>
`
return new Response(script, {headers: headers});
}


addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request))
});
```
In order for the browser to recognize html as layout rather than text, the `Content-Type` header defined as "text/html".

# Preflight requests

 **Preflight requests** first send an HTTP request to a resource on another domain to determine if the actual request is safe to send using the `OPTIONS` method, using three HTTP request headers: 
     * `Access-Control-Request-Method`, 
     * `Access-Control-Request-Headers`,
     * `Origin`. 
  Cross-site requests are pre-screened in this way because they may be involved with user data.
 
A request is preflighted if: 

* The request uses any of the following methods:
   * `PUT`
   * `DELETE`
   * `CONNECT`
   * `OPTIONS`
   * `TRACE`
   * `PATCH`

* HTTP headers are different from those described for the simple request.
* `Content-Type` header value is different from the values defined for simple.

Let's look at an example of using a preflight request.

## Preflight request example

Here we also use workerA and workerB.

Before workerB sends `DELETE` request, the browser will generate an `OPTIONS` request that checks for response headers. 
In order for the preflight request to succeed workerA must have the following headers:
  * `"Access-Control-Allow-Origin": "https://prefligth-test-b.maksgalochkin2.workers.dev"` - allowed domain to respond
  * `"Content-Type": "application/json"`, - input data mime type
  * `"Access-Control-Allow-Methods": "OPTIONS, DELETE"` - allowed request methods

### Worker A
```js
async function handleRequest(request) {
  const headers = {
    "Access-Control-Allow-Origin": "https://prefligth-test-b.maksgalochkin2.workers.dev", 
    "Content-Type": 'application/json',
    "Access-Control-Allow-Methods": "OPTIONS, DELETE"
  }
  try {
    const json = await request.json();
    await KV.delete(json.key);
    return new Response(JSON.stringify({ deleted: json.key}), { headers: headers });
  }
  catch (err) {
    return new Response(JSON.stringify({ error: err.message}), { headers: headers });
  }
}

addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request))
});
```
> DELETE request actions (.json()/.text()) works only inside try/catch

WorkerB sends `DELETE` request to remove data from KV. WorkerA receives request, removes the data, and returns a response that removing was successful.

### Worker B

```js
async function handleRequest(req){

const headers = {"Content-Type": "text/html"};

const layout = `
<input type="text">
<script>
document.querySelector("input").addEventListener("click",  async e=> {
 let data = JSON.stringify({key: '' + e.currentTarget.value});
 const linkA = "https://prefligth-test-a.maksgalochkin2.workers.dev";
 const options = {method: "DELETE", body: data};
 const request = await fetch(linkA, options).then(data=>data.text()).then(res=> res);
 console.log(request);
});
</script>`
return new Response(layout, {headers: headers});
}

addEventListener("fetch", e => {
  e.respondWith(handleRequest(e.request))
});
```

### Reference
* [MDN: simple requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#simple_requests)
* [MDN: Preflight request](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
