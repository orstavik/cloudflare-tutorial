# WhatIs: `referer`?

When making an HTTPS request, web browsers automatically populate a `referer` header in the request. The `referer` means the host from where the script or html page that triggered the request was loaded from, or `null` if the user requested the resource directly (such as when writing the location of an html page directly in the address bar).

The `referer` header is **semi-trustworthy**.

1. You can trust that no other third-party script or page will be able to trick the browser into giving you a *false* `referer` (unless of course the browser itself has been compromised by for example a bad extension). If the `referer` contains a value, then you should be able to trust that value in most usecases.

2. But, the `referer` is often `null`. Giving out the `referer` is a huge privacy concern, and so most modern browsers exclude the `referer` when making cross origin requests, or limit the `referer` to "schemeful origin", ie. the protocol + host origin of the request.

## HowTo: `referer`

To control the `referer` mode, `Referer-Policy` HTTP header is used. The `Referrer-Policy` header controls how much referrer information (sent via the `referer` header) should be included with requests. You can choose [several strategies](https://www.w3.org/TR/referrer-policy/#referrer-policies) from the available `Referrer-Policy` options.


To control the `referer` using `fetch` from a script.
```javascript
const someResource = await fetch('https://your.api/some/resource',
  {
    method: 'POST',
    refererPolicy: 'strict-origin-when-cross-origin'
  }
);
```
> The `Referer` header is similar to `Origin` header, but `Origin` header does not reveal a path. It is used for all HTTP fetches whose request’s response tainting is "cors", as well as those where request’s method is neither `GET` nor `HEAD`. Due to compatibility constraints it is not included in all fetches.


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
## `Referer` problems

 For most of its history, it has been one of the most important ways to track user movements between pages in analytics tools, as well as to understand the origin of incoming traffic. However, the latter has been associated with significant privacy issues. If a user clicks a link in an email from an email client, the site can identify the email domain. Worse, knowing the full URL from which you came, including the query arguments, can reveal terms of your last search query or personal information such as your email address.

The Referer header *can* leak the entire URL to other domains. If the URL contains sensitive data, such as a session token or some other identifier, a leak occurs when the URL is sent in the `Referer` header when the user clicks the link. This is the reason why many antivirus solutions remove the `Referer` header from all HTTP requests to avoid leaking sensitive data in the URL. Because so many antivirus solutions remove the header, we cannot rely on the Referer header being present in every request.

## References

 * [W3: Referrer Policies](https://www.w3.org/TR/referrer-policy/#referrer-policies)
