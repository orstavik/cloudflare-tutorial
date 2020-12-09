# HowTo: whitelist?

## What: access privileges?

> Baseline today is to *only* grant access privileges to HTTPS requests. In this tutorial, we extend this principle to make an API only grant access to other resources that themselves are loaded over HTTPS. If you need to allow access to other resources coming from HTTP, then you must loosen this restriction. Here, we assume the world is only HTTPS, and that unsecure HTTP no longer exists.

In a web app, the most common access privileges that are granted to HTTPS requests are:

1. **CORS**: **use public resources** such as images and scripts in an html-page or script from another origin,
2. **READ**: **read private resources** such as user data, and
3. **WRITE**: **change the state of private resources** such as add/remove user data.

Access privileges are often misunderstood as *universal and hierarchical*:

1. **universal**: all apps basically only need three categories of privileges (READ, WRITE, and CORS/EXECUTE).
2. **hierarchical**: if a request can WRITE, then that request can also READ; and if a request can READ, then that request can also use resources CORS.

Sure, sometimes these assumptions are true: some apps only need to distinguish between cors/read/write, and these privileges form a neat hierarchy (write(read(cors))).

But. Often, these assumptions are false. Some requests are only privy to read *a particular user's data*, while another request is privy to read *every user's data*. Other requests might only be privy to *write and read* to a particular user's data, but is *not* privy to read any data associated with other users. So, even though read, write, and cors privileges resemble each other across apps, there are devils in the details.

Some apps control several resources: for example, a server-side app might control access to two or more different databases, static scripts, and/or computing resources. Such an app might need several, overlapping whitelists: whitelist A grants READ access only to database A; whitelist A2 grants READ access only to a subsegment in database A; whitelist AB grants READ access to database A and B, and write access to database B.

Instead of viewing *access rights as universal and hierarchical* concepts, it is better to view **access rights as app semantics**. Access rights are simple labels. A request might get `full-user` access, that converts into something like read, write, and execute privileges to a particular user's entries in a database; another request might get `read-only` access, ie. it might read data for all users, but only from within the same site and it can never *change any state* on the server. The access rights labels reflect idiosyncratic app particulars - they are not universal Socratic ideals/categories.

## WhatIs: a whitelist?

**Whitelisting** is to:

1. restrict *all* access by default, and then
2. grant access rights one by one,
3. based on the properties of:
	1. the triggering event (such as an HTTP request) and
	2. the state of the program itself.

**Blacklisting** is the reverse process. Here, (all) privileges are granted by default, and then the triggering event and state of the program is reviewed to limit access.

In general, whitelisting is safer than blacklisting. If either a) a triggering event with unforeseen properties or b) something unforeseen happens when the state of the event or the app is checked, then whitelisting should fall back to a "no-access" default. During blacklisting such unforeseen events is much more likely to erroneously leave access rights in limbo.

## HowTo: whitelist HTTPS requests?

At minimum, we check four properties of the HTTPS request during whitelisting:

1. `referer`
2. `method`
3. access tokens (such as a `cookie` or `Token` containing a session and/or user id)
4. the requested action identified by `pathname`,`searchParams`, and/or `body`

The whitelisting is done as part of the following logic in the server-side app:

1. First the requested action is identified by reviewing the `pathname`,`searchParams`, and/or `body`. If there is no requirement for any access privileges or session specific data, then the requested action is simply performed.

2. Then the "list of rights" is calculated using the `referer` and the `method` only. If the action only requires being vetted based on this "list or rights", then the requested action is executed.

3. Finally, the session token is validated and matched with the "list of rights" and the requested action. The server side app now has all potential data at its disposal.

In this tutorial we only describe how to whitelist and convert the `referer` and the `method` into a "list of rights".


## HowTo: declare a whitelist?

In the settings of the app, we declare two JSON strings:
1. access rights (for both `GET` and `POST`)
2. access rights for `POST` only requests

Each table of access rights maps a **privilege** to a **list of hosts**. A **host** can be either a string or a regex string starting with `^` and ending with `$`.

When the server application starts, the map with access rights is prepped:
1. the JSON strings are converted into dictionary objects,
2. and then these objects are sorted under `GET` and `POST` in a ready to use, complete method-to-privilege-to-host map (`methodPrivilegeHost`).

```javascript
function prepAccessRights(rights, postRights) {
  const GET = JSON.parse(rights);
  const POST = JSON.parse(postRights);
  for (let key in GET)
    POST[key] = (POST[key] || []).concat(GET[key]);
  return {GET, POST};
}

//global variables, Leaning toothpicks (4 \\\\ becomes 1 \ in the final regex.
const ACCESS_RIGHTS = `{
"cookie": ["^([^.]+\\\\.){2}workers.dev$", "b.workers.dev"],
"cors": ["^(.*)$"],
"read": ["a.b.workers.dev"]
}`;
const POST_ONLY_ACCESS_RIGHTS = `{
"read": ["^(.*)$"],
"write": ["^([^.]+\\\\.){2}workers.dev$"]
}`;
const methodPrivilegeHost = prepAccessRights(ACCESS_RIGHTS, POST_ONLY_ACCESS_RIGHTS);
```

The resulting `methodPrivilegeHost` in the above example will look like this:

```javascript
const methodPrivilegeHost = {
  GET: {
    cookie: ["^([^.]+\\.){2}workers.dev$", "b.workers.dev"],
    cors: ["^(.*)$"],
    read: ["a.b.workers.dev"]
  },
  POST: {
    cookie: ["^([^.]+\\.){2}workers.dev$", "b.workers.dev"],
    cors: ["^(.*)$"],
    read: ["^(.*)$", "a.b.workers.dev"],
    write: ["^([^.]+\\.){2}workers.dev$"] 
  }
}
```

Att! Regex in strings require backslashes to be doubled. Backslashes in json strings also need to be doubled. Thus, to write **1 \\** regex backslash in json'ed regex strings, you need **4 \\\\\\\\**.  

## HowTo: match `referer` and `method` with `methodPrivilegeHost` 

The `whitelistRefererHttpsGetPost(req, accessRights)` returns both the `access` "list of rights" and the `refHost` (referer host). The `refHost` is needed outside the whitelist function too when CORS privileges are granted. The input to this pure function is the `request` and the `methodPrivilegeHost` map.

```javascript
function hostMatches(host, h) {
  return h[0] === '^' && h[h.length - 1] === '$' ? host.match(h) : h === host;
}

function httpsOriginOrEmptyString(url) {
  if (!url)
    return '';
  url = new URL(url);
  if (url.protocol !== 'https:')
    return '';
  return url.host;
}

function whitelistRefererHttpsGetPost(request, methodPrivilegeHost) {
  const refHost = httpsOriginOrEmptyString(request.headers.get('referer'));
  const listOfRights = Object.entries(methodPrivilegeHost[request.method])
    .filter(([r, hosts]) => hosts.find(h => hostMatches(refHost, h)))
    .map(([right]) => right)
    .join(' ');
  return [listOfRights, refHost];
}
```

Att! In this tutorial, we ignore `port` and treat all non `https` origins as if they were null. 

## WhyAndHow: regex?

Often, you wish to grant *some* access-rights to *all* hosts, and/or *all* access-rights to a still indefinite group of (sub-)domains. For example, an app might wish to give everyone `cors` access, while only a specific domain and its immediate subdomains write access.

To accomplish dynamic host attributes, we use regex. Any string that begins with `^` and ends with `$` is treated as regex. The `^...$` format *both* has the benefit of making the string invalid as a regular domain, *and* ensuring that the entire referer host is evaluated, thus reducing risks for clever domain-name-hacks.

## Demo: Show me your papers!

```javascript
//pure function import begins

function prepAccessRights(rights, postRights) {
  const GET = JSON.parse(rights);
  const POST = JSON.parse(postRights);
  for (let key in GET)
    POST[key] = (POST[key] || []).concat(GET[key]);
  return {GET, POST};
}

function httpsOriginOrEmptyString(url) {
  if (!url)
    return '';
  url = new URL(url);
  if (url.protocol !== 'https:')
    return '';
  return url.host;
}

function hostMatches(host, h) {
  return h[0] === '^' && h[h.length - 1] === '$' ? host.match(h) : h === host;
}

function whitelistRefererHttpsGetPost(req, accessRights) {
  const refHost = httpsOriginOrEmptyString(req.headers.get('referer'));
  const access = Object.entries(accessRights[req.method])
    .filter(([r, hosts]) => hosts.find(h => hostMatches(refHost, h)))
    .map(([right]) => right)
    .join(' ');
  return [access, refHost];
}

//pure function import ends

//global variables, f.. we need four f..ing backslashes to produce one backslash
const ACCESS_RIGHTS = `{
  "cookie": ["^([^.]+\\\\.){2}workers.dev$", "b.workers.dev"],
  "cors": ["^(.*)$"],
  "read": ["a.b.workers.dev"]
}`;
const POST_ONLY_ACCESS_RIGHTS = `{
  "read": ["^(.*)$"],
  "write": ["^([^.]+\\\\.){2}workers.dev$"]
}`;
const methodPrivilegeHost = prepAccessRights(ACCESS_RIGHTS, POST_ONLY_ACCESS_RIGHTS);

//the global variables come in as json strings, and must be converted into a 

const links = `<a href='whitelist.intertext-no.workers.dev'>get</a>
<form method='post' action='whitelist.intertext-no.workers.dev'><input type=submit value=post />`;

function handleRequest(req) {
  const [access, refHost] = whitelistRefererHttpsGetPost(req, methodPrivilegeHost);

  //if cors is added as privilege, then add referer host to cors header.
  const headers = {'content-type': 'text/html'};
  if (access.indexOf('cors') >= 0)
    headers['access-control-allow-origin'] = 'https://' + refHost;

  return new Response(`${req.method} request from ${refHost} has privileges: ${access || 'none'}. ${links}`, {headers});
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

## References

* [The CORS of history](https://en.wikipedia.org/wiki/Same-origin_policy#History)
