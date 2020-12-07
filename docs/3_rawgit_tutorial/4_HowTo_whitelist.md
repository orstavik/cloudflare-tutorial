# HowTo: whitelist?

## WhatIs: a whitelist?

A **whitelist** is a list of hosts whose HTTP requests *may* be granted privileges to:

1. **CORS**: **use public resources** such as images and scripts in a browser,
2. **READ**: **read private resources** such as user data, and
3. **WRITE**: **change the state of private resources** such as add/remove user data.

Commonly, if a host is granted WRITE access to a data resource, that host also has READ access to the same resources. Similarly, if a host is granted READ access to a data resource, that host also has CORS access to use the same resources in a browser. Thus, commonly, the whitelists form a simple hierarchy where hosts are given wider and wider access.

Some apps control several resources: for example, a server-side app might control access to two different databases, or a database and a set of scripts. Such an app might need several, overlapping whitelists: whitelist A grants READ access only to database A; whitelist A2 grants READ access only to that registered users own data in database A; whitelist AB grants READ access to database A and B, and write access to database B. In such instances, *make several parallell whitelists*. The whitelist are supposed to declare and highlight the logic of protection in your app/API/data set.

Advice: If you can, avoid managing several data sources with different whitelists in the same app.

## WhatTo: whitelist?

Web browsers making requests to web servers automatically populate a `referer` header in the request. The `referer` header is the host from where the script or html page that triggered the request was loaded from.

The `referer` header can be trusted, in the sense that a modern browser that has not been compromised by a bad extension or hacked, will never allow a script, a user, or another web page to make an HTTP request with an altered `referer` value.

However, the `referer` header can often be `null`. And more and more, the `referer` header only includes the `host` of the referer.

However, if you make an API, you can specify that any request to your API must include a `referer` with information about the `host`. This essentially stipulate that users of your API must use `POST` requests and allow the `referer` to be included:

```javascript
const someResource = await fetch('https://your.api/some/resource',
  {
    method: 'POST',
    refererPolicy: 'strict-origin-when-cross-origin'
  }
);
```

## WhatDo: CORS do?

But. Some of your resources are not accessed by nice `POST` requests with an even nicer `referer` header. The web is webby (a web page might contain references to scripts and images to different servers), and these requests are made using `GET` requests that has a `referer=null` header.

And another but. Your browser still would like to respond to such queries. The web page that sends the not so nice `GET` request with the missing `referer`, might still be supposed to use the resource (the host might still be in your CORS whitelist). Furthermore, even though the browser *do not* send the `referer` with the `GET` request, the browser might still include a nice, safe, secret, httpOnly cookie with the request. If you only could verify the `referer` at the same time, then you would happily give that request READ access to private user data.

The solution here is CORS. CORS enable your server to *outsource* the job of verifying the `referer` to the browser *after* the browser receives the private data. Your server can trust the browser that delivers the cookie. And the browser has all the information needed: the browser knows the missing `referer` in the `GET` header (the browser didn't send that information with the `GET` request only to protect the privacy of your user, it has it no problem), and the browser can read the headers of your server's response to see if that `referer` should have access to read data coming from your server. So, if your server does *not* add an `access-control-allow-origin` header that gives the hidden `referer` access to your resource, then the browser can block that data from being shown.

CORS is very strange security mechanism for sure. CORS blocks sensitive data *after* it has left the server inside the browser. This means that CORS gives some protection for READing data, but NO protection for illicit WRITing. So, in essence, CORS can be used to protect reading of non-super-sensitive user data, iff that request also contains a trustworthy cookie.

## HowTo: `whitelistReferer(request, accessRights)`?

Server-side, we only accept `https` requests and ignore `port` settings. We check both the `referer` and the `method` in an HTTP request against a access rights map.

```javascript
function whitelistRefererHttpsGetPost(req, accessRights) {
  //1. check method
  if (req.method !== 'GET' && req.method !== 'POST')
    return ['', undefined];

  //2. check for empty referer and referer protocol
  const referer = req.headers.get('referer');
  if (!referer)
    return ['', undefined];
  const refUrl = new URL(referer);
  if (refUrl.protocol !== 'https')
    return ['', undefined];

  //3. getAccess per domain
  let access = accessRights[refUrl.host] || '';
  if (req.method === 'GET')
    access = access.replace(/[A-Z]/g, '');
  return [access.toLowerCase(), refUrl.host];
}

const accessRights = {
  'example.com': 'cors read WRITE',
  'partner.com': 'cors read',
  'another.com': 'cors'
}

whitelistRefererHttpsGetPost(incomingRequest, accessRights);
```

Attention:

1. The **app specifies the semantics of the access rights**. Names such as `read`, `cors`, `write`, `write-user-data-only`, `cors-css-only`, etc. are defined by the app.
2. **lowercase** access rights can be accessed from **`GET` requests**. All uppercase access rights will be stripped if the request is *not* a `POST` request.
3. By changing the uppercase/lowercase letters in the accessRights map, `POST`/`GET` restrictions can be tightened/loosened differently in different apps.

`whitelistRefererHttpsGetPost(request, accessRights)` is a pure function which:

* input is the request and an access rights map (domain=> space separated string of access rights), and
* output both a) a string of space separated access rights and b) the referer host.

The `whitelistRefererHttpsGetPost(incomingRequest, accessRights)` is a pure function that can be reused across different apps.

The access rights map is an object that maps the different access rights per domain name.

## HowTo: regex `whitelistRefererHttpsGetPost(...)`?

Often, you wish to grant *some* access-rights to *all* hosts, and/or *all* access-rights to a still indefinite group of (sub-)domains. For example, an app might wish to give everyone `cors` access, while only a specific domain and its immediate subdomains write access.

To accomplish dynamic host attributes, we use regex. Any string that begins with `^` and ends with `$` is treated as regex. The `^...$` format *both* has the benefit of making the string invalid as a regular domain, *and* ensuring that the entire referer host is evaluated, thus reducing risks for clever domain-name-hacks.

Att!! Remember **double \\**!!

```javascript
function convertAccessRights(dict) {
  return dict.entries().map(([k, v]) => [k.startsWith('^') && k.endsWith('$') ? new RegExp(k) : k, v]);
}

function whitelistRefererHttpsGetPost(req, accessRights) {
  //1. check method
  if (req.method !== 'GET' && req.method !== 'POST')
    return ['', undefined];

  //2. check for empty referer and referer protocol
  const referer = req.headers.get('referer');
  if (!referer)
    return ['', undefined];
  const refUrl = new URL(referer);
  if (refUrl.protocol !== 'https')
    return ['', undefined];

  //3. get all matching access rights for referer domain
  const matchingRights = '';
  for (let [h, rights] of accessRights) {
    if(h instanceof RegExp ? h.match(refUrl.host) : h === refUrl.host)
      matchingRights += rights + ' ';
  }
  let access = new Set(matchingRights.split(' ')).toArray().join(' ');
  //3b. filter out uppercase letters in GET requests.
  if (req.method === 'GET')
    access = access.replace(/[A-Z]/g, '');
  return [access.toLowerCase(), refUrl.host];
}

const accessRights = {
  //root domain or direct subdomain can read and cors, and WRITE from POST requests 
  '^([^.]*\\.)?example.com$': 'cors read WRITE',
  //all domains get cors
  '^.*$': 'cors'
}

const preppedAccessRights = convertAccessRights(accessRights);
whitelistRefererHttpsGetPost(incomingRequest, preppedAccessRights);
```

## Demo: Show me your papers!

```javascript
//pure function import begins
function convertAccessRights(dict) {
  return dict.entries().map(([k, v]) => [k.startsWith('^') && k.endsWith('$') ? new RegExp(k) : k, v]);
}

function whitelistRefererHttpsGetPost(req, accessRights) {
  //1. check method
  if (req.method !== 'GET' && req.method !== 'POST')
    return ['', undefined];

  //2. check for empty referer and referer protocol
  const referer = req.headers.get('referer');
  if (!referer)
    return ['', undefined];
  const refUrl = new URL(referer);
  if (refUrl.protocol !== 'https')
    return ['', undefined];

  //3. get all matching access rights for referer domain
  const matchingRights = '';
  for (let [h, rights] of accessRights) {
    if(h instanceof RegExp ? h.match(refUrl.host) : h === refUrl.host)
      matchingRights += rights + ' ';
  }
  let access = new Set(matchingRights.split(' ')).toArray().join(' ');
  //3b. filter out uppercase letters in GET requests.
  if (req.method === 'GET')
    access = access.replace(/[A-Z]/g, '');
  return [access.toLowerCase(), refUrl.host];
}
//pure function import ends

//global variable
const accessRights = {
  '^([^.]*\\.)?example.com$': 'read WRITE',
  '^.*$': 'cors READ'
}

const accessRights2 = convertAccessRights(accessRights); 

function handleRequest(req) {
  const [privies, refHost] = whitelistRefererHttpsGetPost(req, accessRights2);

  //if cors is added as privilege, then add referer host to cors header.
  const headers = {'content-type': 'text/html'};
  if (privies && privies.indexOf('cors') !== -1)
    headers['access-control-allow-origin'] = refHost;

  const result = `You requested: from ${refHost} with ${req.method} which gives you ${privies || 'no'} privileges.`;
  return new Response(result, {status: 200, headers});
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

## References

 * 
