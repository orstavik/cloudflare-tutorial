# WhatIs: `referer`?

When making an HTTPS request, web browsers automatically populate a `referer` header in the request. The `referer` means the host from where the script or html page that triggered the request was loaded from, or `null` if the user requested the resource directly (such as when writing the location of an html page directly in the address bar).

The `referer` header is **semi-trustworthy**.

1. You can trust that no other third-party script or page will be able to trick the browser into giving you a *false* `referer` (unless of course the browser itself has been compromised by for example a bad extension). If the `referer` contains a value, then you should be able to trust that value in most usecases.

2. But, the `referer` is often `null`. Giving out the `referer` is a huge privacy concern, and so most modern browsers exclude the `referer` when making cross origin requests, or limit the `referer` to "schemeful origin", ie. the protocol + host origin of the request.

## HowTo: `referer`

To control the `referer` using `fetch` from a script:

```javascript
const someResource = await fetch('https://your.api/some/resource',
  {
    method: 'POST',
    refererPolicy: 'strict-origin-when-cross-origin'
  }
);
```

Control the default `referer` for your website in your HTTPS response:

```javascript
return new Response('hello sunshine', {headers: {
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}});
```

Control the `referer` from html elements:

```html
<a href="https://some.other.site/resource" rel="noreferrer">stay anonymous</a>
```

## References

 * 