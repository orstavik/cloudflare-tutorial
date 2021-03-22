# WhenTo: `Object.fromEntries(...)`

There are some javascript objects that are not really objects. They don't respond the way you want them to, and they are hard to print. And in the context of a serverside worker, the two you most likely will struggle with first are: `URL.searchParams` and `Request.headers`.

Use `Object.fromEntries(...)` to convert these special JS objects into normal objects that behave the way you expect.

## `request.headers`

`request.headers` doesn't print well, so we must use the function `Object.fromEntries(...)` to print it nicely.

```javascript
async function handleRequest(request) {
  const headers = Object.fromEntries(request.headers);
  console.log('headers2');
  return new Response(JSON.stringify(headers, null, 2));
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

## `urlSearchParams`

Remember `Object.fromEntries()`.

```javascript
//1. test searchParams global scope
const url = new URL('https://example.com/?alice&bob=hello&cat&cat=sunshine');
const searchParams = Object.fromEntries(url.searchParams);
console.log(JSON.stringify(searchParams, null, 2));

//2. test searchParams in the fetchEvent scope
async function handleRequest(request) {
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams);
  return new Response(JSON.stringify(searchParams, null, 2));
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

## References

 * https://developer.mozilla.org/en-US/docs/Web/API/Headers
 * https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries