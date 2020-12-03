# HowTo: make sessionID with cookies?

## HowTo: `secure` an `httpOnly` cookie?

A cookie is a `name=value;` string. To a cookie, you can append yet more attributes as `key=value;` pairs.

A cookie can be fully secured in modern browsers that support other technologies such as web components, using the
following settings:

1. `Secure;` The browser will only add the cookie in `https` request, the cookie will never be sent from the browser to
   the server in unsecure `http` requests. The browsers' default value is `Secure=false`, so you should always
   add `Secure;`.

2. `HttpOnly;`. The browser only stores and automatically appends the cookie to apropriate HTTP requests. No js script,
   not even from your own site, can read the cookie. No js, never. Browsers default is `HttpOnly=false`, and you should
   always set `httpOnly;` if you don't specifically need to access the cookie from js.

3. `SameSite=Lax;`. The cookie will only be sent from the browser to the server when a) the script or html element that
   requests a resource is loaded from the `SameSite`, or b) when the browser navigates to a `.html` page from that
   server (either directly in the navigation bar, or via clicking a link). `SameSite=Lax` restrict scripts and html
   pages from passing a cookie to your server when they make `fetch(...)` requests, or requests a `js` script,
   an `<img src>`, or a `<link rel=stylesheet>` from your server, for example. Soon, modern browsers will default
   to `SameSite=Lax`, but for now old browsers default to `SameSite=None`.

4. `Domain=.example.com;`. The cookie will be sent from the browser when the request is made to a resource under the specified domain and all its subdomains, and sub-sub-domains, etc.
    * "Super cookies" with domains such as `.com` are no longer allowed in modern browsers.
    * You can't set a cookie on a grandparent domain. If your worker is responding from `abc.one-two-three.example.com`, this response cannot set a cookie on domain `.example.com`, only on the domain `.one-two-three.example.com`, `abc.one-two-three.example.com`, `any.subdomain.abc.one-two-three.example.com`, etc.
    * The domain value should start with a `.`. If you forget this, the browser will automatically add a `.` as the first character. Thus, `Domain="example.com";` becomes `Domain=".example.com";` 

5. `Path=/my/path;`. The path also limits the scope of the cookie. It consists of directory components, separated by the
   symbol `/`. A cookie is included in requests whose URI starts with the corresponding path components. If no attribute
   is set, the path is taken from the request URI and set to be the same as the `pathname` up until the last `/` (all
   the folders, but not the filename).
   
## HowTo: `Max-Age`?

>  [Never use `Expire`, always use `Max-Age`.](./WhatIs_httpOnly_cookie.md)

* `Max-Age=-1`. The browser will forget the cookie as soon as it closes.
* `Max-Age=0`. The browser will delete the cookie.
* `Max-Age=300`. The browser will remember the cookie for 5min, and then forget it. The cookie is persisted to long term storage if need be, but will also be removed from the registry after 5min in all instances, even if the same browser remains open.
* `Max-Age=2592000`. The browser will remember the cookie for a month (30days*24hrs*3600sec).
* No `Max-Age` is set. This is the default value, but it is better to use `Max-Age=-1` in this instance, as you both clearly communicate intent and will override any `Expire` settings.

By default, cookies are deleted when the browser window is closed (ie. no `Max-Age`/`Max-Age=-1`).

When a short `Max-Age`, say 5min, is used, this can be problematic because it will override the "delete when window is closed" convention. Unaware users might quickly log in and perform their tasks and log out and leave a public computer, anticipating that closing the window will log them out. Not being able to tell the browser that it should delete a cookie *both* when the browser closes and within 5minutes, whichever comes first, is a problem.  

When logging in, the user is often asked: `"remember me (on this computer)"`? This convention essentially translates into a sessionID cookie with a `Max-Age` of a week or a month (7*24*3600 or 30*24*3600), depending on the application.

## Server: The `Set-cookie` header

To make a cookie string and send it from the server to the browser, use some custom functions and the `set-cookie` header on the HTTP response object. In js it would look something like this:

```javascript
//cookie forgotten when the browser is closed
function forgetMeCookie(name, value, domain) {
  return `${name}=${value}; domain=${domain}; path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=-1;`;
}

//cookie remembered for an hour (3600sec)
//cookie remembered for a month (30days*24hrs*3600sec)
//commonly, this is the same for all instances, and so the max-age can
//be specified as part of the fixed string.
function rememberMeCookie(name, value, domain) {
  return `${name}=${value}; domain=${domain}; path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=2592000;`;
}

//remove cookie from browser
function deleteCookie(name, domain) {
  return `${name}=0; domain=${domain}; path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0;`;
}

function handleRequest(req) {
  const cookie = rememberMeCookie('my-cookie', 'my-cookie-value', 'my.root.domain.com');
  return new Response('hello cookie', {
    status: 200,
    headers: {
      'set-cookie': cookie
    }
  });
}
```

## Rolling cookie

The server cannot specify that the browser should delete the cookie when the session has been *inactive* for a certain period of time. This common usecase is therefore instead implemented server-side as a so-called "rolling cookie".

When implementing a rolling cookie, the server will:
1. check the status of the current cookie, and
2. if the current cookie is valid, send a new `set-cookie` header with the same cookie but with an updated `Max-Age`.

To embellish the rolling cookie pattern, the server can associate an issue at time (`iat`) with the cookie. The `iat` would either be stored in the database in the Synchronizer patter, or be part of the encrypted data package with encrypted session id. However. This embelishment adds complexity and details to the rolling cookie. And, with encrypted cookies, replacing the encryption secret at specific intervals would accomplish the same as implementing rolling cookies. So, in this discussion, we leave the rolling cookie as a mechanism to create an infinite session as long as the user constantly keeps the session alive within the given *inactive time out* window. 

```javascript
//cookie forgotten when the browser is closed
function forgetMeCookie(name, value, domain) {
  return `${name}=${value}; domain=${domain}; path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=-1;`;
}

//cookie remembered for an hour (3600sec)
//cookie remembered for a month (30days*24hrs*3600sec)
//commonly, this is the same for all instances, and so the max-age can
//be specified as part of the fixed string.
function rememberMeCookie(name, value, domain) {
  return `${name}=${value}; domain=${domain}; path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=2592000`;
}

//remove cookie from browser
function deleteCookie(name, domain) {
  return `${name}=0; domain=${domain}; path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}
function handleRequest(req) {
  const cookieIn = req.headers.get('cookie');
  const myCookieValue = getCookieValue(cookieIn, 'myCookie');
  const isValid = verifySession(myCookieValue);
  const cookie = isValid ?
    rememberMeCookie('my-cookie', 'my-cookie-value', 'my.root.domain.com'):
    deleteCookie('my-cookie', 'my-cookie-value', 'my.root.domain.com');
  return new Response('hello cookie', {
    status: 200,
    headers: {
      'set-cookie': cookie
    }
  });
}
```

The example above is very crude. For example, if no cookie is given in, then no cookie should be given out. 

## References

* [Sessions and Cookies](https://auth0.com/docs/sessions-and-cookies)
* [MDN: Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
* [RFC 6265](https://tools.ietf.org/html/rfc6265#section-4.1)
* [Blog: "Just how many web users really disable cookies or JavaScript?"](https://blog.yell.com/2016/04/just-many-web-users-disable-cookies-javascript/)
* [sending cookies using fetch](https://github.com/github/fetch#user-content-handling-http-error-statuses)
* [default value of path or domain](https://stackoverflow.com/questions/43324480/how-does-a-browser-handle-cookie-with-no-path-and-no-domain#answer-43336097)
* [stackoverflow: `max-age=-1` vs. `max-age=0`](https://stackoverflow.com/questions/15932957/difference-between-0-and-negative-value-for-setmaxage-for-cookie)