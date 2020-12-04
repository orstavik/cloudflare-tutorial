# HowTo: whitelist?

## WhatIs: a whitelist?

A **whitelist** is a list of hosts whose HTTP requests *may* be granted privileges to:

1. **CORS**: **use public resources** such as images and scripts in a browser,
2. **READ**: **read private resources** such as user data, and
3. **WRITE**: **change the state of private resources** such as add/remove user data.

Commonly, if a host is granted WRITE access to a data resource, that host also has READ access to the same resources.
Similarly, if a host is granted READ access to a data resource, that host also has CORS access to use the same resources
in a browser. Thus, commonly, the whitelists form a simple hierarchy where hosts are given wider and wider access.

Some apps control several resources: for example, a server-side app might control access to two different databases, or
a database and a set of scripts. Such an app might need several, overlapping whitelists: whitelist A grants READ access
only to database A; whitelist A2 grants READ access only to that registered users own data in database A; whitelist AB
grants READ access to database A and B, and write access to database B. In such instances, *make several parallell
whitelists*. The whitelist are supposed to declare and highlight the logic of protection in your app/API/data set.

Advice: If you can, avoid managing several data sources by the same app. When you can, try to have one app for one data
source. Why? Managing a myriad of data sources and whitelists quickly becomes confusing and cause the developer to make
mistakes: "read" does no longer mean one thing, but becomes a concept that needs to be investigated against different
data sources. Thus. Try to split API access on the app level (cf. microservices), not data source level.

## WhatTo: whitelist?

Web browsers making requests to web servers automatically populate a `referer` header in the request. The `referer`
header is the host from where the script or html page that triggered the request was loaded from.

The `referer` header can be trusted, in the sense that a modern browser that has not been compromised by a bad extension
or hacked, will never allow a script, a user, or another web page to make an HTTP request with an altered `referer`
value.

However, the `referer` header can often be `null`. And more and more, the `referer` header only includes the `host` of
the referer.

However, if you make an API, you can specify that any request to your API must include a `referer` with information
about the `host`. This essentially stipulate that users of your API must use `POST` requests and allow the `referer` to
be included:

```javascript
const someResource = await fetch('https://your.api/some/resource',
  {
    method: 'POST',
    refererPolicy: 'strict-origin-when-cross-origin'
  }
);
```

## WhatDo: CORS do?

But. Some of your resources are not accessed by nice `POST` requests with an even nicer `referer` header. The web is
webby (a web page might contain references to scripts and images to different servers), and these requests are made
using `GET` requests that has a `referer=null` header.

And another but. Your browser still would like to respond to such queries. The web page that sends the not so nice `GET`
request with the missing `referer`, might still be supposed to use the resource (the host might still be in your CORS
whitelist). Furthermore, even though the browser *do not* send the `referer` with the `GET` request, the browser might
still include a nice, safe, secret, httpOnly cookie with the request. If you only could verify the `referer` at the same
time, then you would happily give that request READ access to private user data.

The solution here is CORS. CORS enable your server to *outsource* the job of verifying the `referer` to the browser *
after* the browser receives the private data. Your server can trust the browser that delivers the cookie. And the
browser has all the information needed: the browser knows the missing `referer` in the `GET` header (the browser didn't
send that information with the `GET` request only to protect the privacy of your user, it has it no problem), and the
browser can read the headers of your server's response to see if that `referer` should have access to read data coming
from your server. So, if your server does *not* add an `access-control-allow-origin` header that gives the
hidden `referer` access to your resource, then the browser can block that data from being shown.

CORS is very strange security mechanism for sure. CORS blocks sensitive data *after* it has left the server inside the
browser. This means that CORS gives some protection for READing data, but NO protection for illicit WRITing. So, in
essence, CORS can be used to protect reading of non-super-sensitive user data, iff that request also contains a
trustworthy cookie.

## HowTo: whitelist `referer` server-side?

So, server-side you need to check both the `referer` and the method. The `method` is used to filter those whitelists,
and the `referer` then checked against these whitelists.

Here, we only filter `https` requests and we ignore the `port`.

```javascript
const CORS_WHITELIST = ['a.friend.com', 'a.partner.com'];
const READ_WHITELIST = ['example.com'];
const WRITE_WHITELIST = ['example.com'];

const emptyResult = ['', null];

function whitelist(refUrl, reqUrl, method) {
  if (method !== 'GET' && method !== 'POST')
    return emptyResult;
  if (!refUrl)
    return emptyResult;
  refUrl = new URL(refUrl);
  reqUrl = new URL(reqUrl);
  if (refUrl.protocol !== reqUrl.protocol)
    return emptyResult;
  const refUrlHost = refUrl.host;
  if (refUrlHost === reqUrl.host)
    return ['same-origin', refUrlHost];
  if (method === 'POST' && WRITE_WHITELIST.indexOf(refUrlHost) >= 0)
    return ['write', refUrlHost];
  if (READ_WHITELIST.indexOf(refUrlHost) >= 0)
    return ['read', refUrlHost];
  if (CORS_WHITELIST.indexOf(refUrlHost) >= 0)
    return ['cors', refUrlHost];
  return emptyResult;
}

function handleRequest(req) {
  const referer = req.headers.get('referer');
  const [privies, refHost] = whitelist(referer, req.url, req.method);

  const headers = {'content-type': 'text/html'};
  if (privies)
    headers['access-control-allow-origin'] = refHost;

  const result = `You requested: from ${referer} with ${req.method} which gives you ${privies || 'no'} privileges.`;
  return new Response(result, {status: 200, headers});
}

addEventListener('fetch', e=>e.respondWith(handleRequest(e.request)));
```

## References

* 
