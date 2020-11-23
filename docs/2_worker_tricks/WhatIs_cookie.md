# WhatIs: HTTP cookie?

## Why: HTTP cookies?
 
HTTP cookies do three things: 

1. Cookies can store state data on file. Ecce! Web apps in the browser can remember state even when the browser/ web app is closed using cookies.

2. Cookies are *automatically* sent from the browser to the server with each HTTP request. Ecce! Web apps running in the browser can share state information with web apps running on the server using cookies.

3. Cookies can *manually* be sent from the server to the browser. Ecce! Web apps running on the server can share state information with web apps running in the browser using cookies.

Web apps use cookies for *many* different tasks: remember selected elements, user preferences, registration data, location data on a web page. This state information is commonly referred to as a "session".

## WhatIs: a "session"?

A **session** is a sequence of individual actions that 
1. span across both locations (e.g. both client and server),
2. span across time (e.g. two different times a user visits the same web app/domain), and
3. that are bound together by a common denominator, which most commonly is the same user (or more crudely the same browser on the same computer).

To implement a 'session' you need simply to create/access a data store that can room your values. This data store must be accessible both across the time span you require, and from all the different locations that is required.
 
When you add state information during a session, you have an architectural choice to make:
1. Immutable state? Ie. keep adding information about actions, so that the session data store continues to grow and grow until the session ends, or
2. Mutable state? Ie. change state information as variables, *in place*, so that the different entities that read and writes state information all work against and alter the same locations.

Most commonly the second, state mutating approach is taken when session data is stored. The reason for this is that state locations are commonly constrained in terms of space. For example, HTTP cookies are limited to 50 cookies, 40mb a piece. So, most commonly, your architectural choice is non-existent: you must *mutate* your session state data *in place* because either space scarcity or conventional conformity says so.

## WhatIs: a cookie?

A cookie is a key-value data pair. The cookies are **automatically stored client-side** in the (long-term) memory of browsers; they are usually **not** stored server-side (although server-side apps often store cookies in order to track their users). 

## The life-cycle of an `httpOnly` cookie

The life of an `httpOnly` cookie most often begin when a web app receives a new request from a browser that does not provide it with a cookie. The server then recognizes that a 'new' browser is start to interact with it, and it sends the browser a `set-cookie` header with the response requested by the browser. The cookie is born on the server, and then immediately sent to the browser. 

When the browser receives the response from the server with the `set-cookie` the response, the browser then stores the cookie in its cookie register. This is the home of the cookie.
 
Every time the browser sends a new request to a server, it checks its cookie registry to see if there are any cookies that "belong" to that domain/path. Cookies that belong to that domain/path, are then added as `cookie` headers to the outgoing request and sent from the browser 'to visit' the server.
 
The cookie is only staying with the server for a few milliseconds. But while visiting, the server can decide to mutate the cookie. It will then alter the content of the cookie and send it back as a new `set-cookie` response header.

The cookie dies when either a) the browser is closed and no `max-age` nor `expire` attribute is set, b) the `max-age`/`expire` timestamp expires, or c) the server send the browser a `set-cookie` header with `max-age` = `0` or `-1` (or an `expire` timestamp in the past).

> Cookies can also be created and mutated in the browser. As long as the cookie is not marked `httpOnly`, javascripts in the browser can create and change and kill cookies. This of course is necessary for cookies to contain state information about which items are placed in a shopping-cart, or which items the user has hovered with his/her mouse.
 

##### continue here

is set sent out to the server Servers commonly add cookies to the browser that contain state information about the session. One cookie might contain information about the user's identity or lack thereof. At the same time, the web app running in the browser might also add store state information about items in the shopping cart and which 

Once a user has visited a couple of web sites, the cookie register in the browser will be filled with lots of different cookies, registered under different domains and paths, and with varying restrictions and expiration dates.
  
of that is stored in the user's browser until a certain period expires. The browser will store this information and pass it to the server with each request as part of the HTTP header. In technical terms, cookies are small text files. According to RFC 6265 the browser **must store** up to 50 cookies per domain, each upto 4MB in size. However, the user can delete and clean up saved cookies any time they want, so the cookies is a reliable, but not dependable store for state data in the browser.

## HowTo: `cookie` and `set-cookie`

When the browser makes an HTTP request to a server, the browser automatically appends all relevant cookies in the `cookie` header of the HTTP request. The browser selects *relevant* cookies based on cookie settings such as `domain`, `path` and `max-age`. Cookies are appended to the `cookie` header as a string where each attribute is formatted as a `key=value` pair separated by a `;`.

The server can add a cookie to the browser by adding a `set-cookie` HTTP response header to a `Response`. When the browser receives a `set-cookie` header, the browser update(overwrite) the value for that cookie in its cookie store.

## Cookie and `set-cookie` header attributes.

The server controls the cookies in the browser via these attributes:
 
 - `max-age`: ttl of the cookie in seconds. The `max-age` will overwrite/replace any `expires`. Use `max-age`, not `expires`.
 - `domain`: limits the scope of cookie validity to the specified domain and all its subdomains. If not specified, the `domain` equals the `domain` in the request.??
 - `path`: cookies can be limited to certain paths within a domain, f.x. `example.com/only/apply/cookie/in/this/path`. All requests to the same domain whose path **begins** with the cookie's `path` attribute will get that cookie. The default value of the `path` is the "folder" of the request sent, `/default/value/` in `https://example.com/default/value/file.name`. 
 - `secure` - the flag set in Secure allows the transfer of cookies only through a secure channel. In particular, if the flag is set, the cookie will not be transmitted `over HTTP, but will be over HTTPS`. By default, the flag is not set. You should always include it however, its only when you are debugging against localhost that you might wish to disable it for a little while.
 - `httpOnly` - the flag set in HttpOnly, limits the scope of cookie use only within the HTTP protocol. If this flag is enabled, it will not be possible to access cookies from JavaScript through the browser API. This flag is not set by default. If you do not have a use-case in which you need to read or write to the cookie from a js script in the browser, you should add this attribute. 

 - `expires` - date and time of expiration. By default, cookies are valid until the web browser session ends. Do not use `expire`, use `max-age` instead.

## WhatIs: a session?

A session is controlled by the server. Cookies are used to mark the browser in the eyes of the server. HTTP Cookies that are set in the response header from the server to the browser, and then returned from the browser to the server in the request header.

HTTP cookies enable cloudflare workers (the server) to store and receive state in the browser (the client). The cookie itself is a simple keyString=>valueString. The cookie has several other properties that control its expiration time and the access to the cookie from tabs/iframes in the browser loaded from other servers. 

## SessionID cookie

> Session: a set of interactions between f.x. a user and an application that take place within a given timeframe.

HTTP cookies can manage a session that takes place between:
1. a cf worker (server app),
2. a user,
3. a (trusted) browser, and
4. an HTML/JS app in the browser.

When we use HTTP cookies to control a session between these four actors, we call it a sessionID cookie. A sessionID cookie is a secure cookie, and we will describe here how to secure them. This guide describes what the cloudflare worker should tell the browser in order to protect a user's data run from that cloudflare worker.

## WhatIs: RememberMe or ForgetMe or Rolling cookies?

> Session cookies are removed when the client shuts down. 


To make the browser either forget the session when the browser window closes, or remember the user's login even while the browser is shut down, use the `Max-age` attributes on `Set-Cookie`. The value of `Max-Age` is a TTL number in seconds after last `Set-Cookie` directive in a response.

> `Expires` is an older alternative to `Max-Age`. It require a more complex Date UTC format value (`new Date().toUTCString()`), and is always overridden by `Max-Age` when both attributes are set.

1. **ForgetMe cookies**, aka. **session cookies**, are delete by the browser every time the full browser window with that cookie is closed by the user (closing a tab in a window is not enough to forget a session cookie). To create a **forgetMe** cookie simply do NOT  set neither `Max-Age` nor `Expires` attributes on the cookie.

```javascript
async function handleRequest(req) {

  const url = new URL(req.url);
  const [ignore, action] = url.pathname.split("/")

  if (action === "setCookie")
    return new Response('hello cookie', {
      status: 200, headers: {
        'Set-Cookie': 'myCookie=hello sunshine; SameSite=Strict; Path=/;'
      }
    })

  return new Response('<a href="setCookie">set cookie</a>', {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    }
  })
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

2. **RememberMe cookies**, aka **permanent cookies**, are saved by the browser even when the browser closes that browser window. The browser deletes the cookie when the `Max-Age` is reached. To create a **rememberMe** cookie, set a `Max-age` several days into the future, for example 1 day or 30 days. If the browser has already set a rememberMe cookie, do not set the cookie again.

To prevent the user from having to enter his password every day (after the session ends), it is customary to remember that he is authorized in a cookie.

Usually, cookies set for a certain period (for example, a month) or permanently. In the second case, the user will be logged in (i.e. he will be able to log in without entering his password) until he clicks the 'Logout' link or accesses the site from another browser.

How can this be implemented correctly? The principle is as follows: a random string should be written into the user's cookie and simultaneously into the database.
- The first thing we do when entering the site is to check if the session is running. If it is running, the user is authorized. If it is not, then we look at the cookie and look there for a note about authorization.
 - If a cookie is marked, then we shall search the database for a user with such login and check whether a random string from the cookie matches a random string from the database for that user.
- If it matches, we shall authorize it, i.e. start the session (the same procedure as for login and password authentication).
- If there is no match, we shall show him the authorization form.
- When authorising by login and password, we shall write a random line to the user in a cookie and a database. This shall be done only if the user has ticked the 'Remember me' box. Why? Because the user may not be at his computer and therefore does not want another person after him to be able to log in under his cookie login (i.e. without entering the password!).
Therefore it is always worth giving the user a choice - he wants his browser to remember him in a cookie or not.

```javascript
function getCookieValue(cookie, key) {
  return cookie?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`)?.pop();
}

async function handleRequest(req) {
  const url = new URL(req.url);
  const [ignore, action, rememberMe] = url.pathname.split("/");
  const maxAge = rememberMe ? 60 : 3 * 1;
  if (action === "login")
    return new Response("logged in " + (rememberMe ? " and remember" : ""), {
      status: 200, headers: {
        'Set-Cookie': `myCookie=hello sunshine; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}; `
      }
    })

  return new Response(`<a href="login">login</a><br>
  <label>Remember Me
    <input type="checkbox">
  </label>
  <script>
  document.querySelector("a").addEventListener("click", e=>{
  e.preventDefault();
   let input = document.querySelector('input');
   let url = e.currentTarget.href;
      if (input && input.checked)
       url += '/rememberMe';
   return window.location = url;    
  })
  </script>
  `, {
    status: 200, headers: {'Content-Type': 'text/html',}
  })
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```
   **RememberMe cookies** should not last infinitely. If a **RememberMe** cookie is set up to last for 365 days, then if it leaks, a leaked cookie might be valid for many months. To avoid such problems, **rolling cookies** can be used.   

3. **Rolling cookies** is a particular type of RememberMe cookies. Rolling cookies create rolling sessions, a session whose TTL is automatically extended while the user is active. 

   To create a **rolling cookie**, the server/worker sets a 'medium' `Max-age`: for example 4 hours (a long lunch break) or 10days (a short holiday). While the user remains active, this timeframe is continuously pushed into the future every time the browser interacts with the server. This is achieved by the cloudflare worker *always* sending the browser an update cookie with an updated `Max-Age` attribute. The cloudflare worker must keep track internally to for example only update Rolling Cookie upto a rolling cookie `Max-Age`. This functionality the cloudflare worker must implement itself, there is no support for it in the HTTP cookie standard. (It is of course possible to only update the session once for example it is halfway spent: for example only give a new 4 hour session once the current rolling session has less than 2hours left on the clock. Such a simple check can dramatically reduce the network overhead needed to extend the rolling cookie on each interaction).
  >The idea is that a cookie value should store both the value of the last update and the cookie value separated by `.`. 

```javascript
function getCookieValue(cookie, key) {
  return cookie ?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`) ?.pop();
}

async function handleRequest(req) {
  const url = new URL(req.url);
  const [ignore, action] = url.pathname.split('/');
  const maxAge = 60 * 1;
  const cookies = req.headers.get('cookie');
  const iatString = getCookieValue(cookies, 'iat');
  const [iatDate, value] = iatString ?.split('.') || [];
  const iat = new Date(parseInt(iatDate || Date.now()));
    return new Response('rolling cookie: ' + iat.toUTCString(), {
      status: 201,
      headers: {
        'Content-type': 'text/html',
        'Set-Cookie': `iat=${Date.now() + '.' + 'roll'}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge};`
      }
    });
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

# HowTo: delete cookie

Just set the cookie on exactly the same name, path and domain, but with an `Expires` or `Max-Age` value in the past.  The server will be successful in removing the cookie only if the `Path` and the `Domain` attribute in the `Set-Cookie` header match the values used when the cookie added. Setting on exactly the same path is important. Many starters fail in this by using only the same name and domain and relying on the current request URL for the default path.

```javascript
        const myDomain = 'https://my-domain.workers.dev'
        //add cookie
        return new Response("cookie added", {
            status: 201,
            headers: {
                'Set-Cookie': `myCookie=helloSunshine; Secure; HttpOnly; SameSite=Strict; Path=/; Domain=${myDomain}; Max-Age=${60*1};`
            }
        });
        // delete cookie with the same path and domain attribute values
        return new Response("cookie deleted", {
            status: 201,
            headers: {
                'Set-Cookie': `myCookie=undefined; Secure; HttpOnly; SameSite=Strict; Path=/; Domain=${myDomain}; Max-Age=-1;`
            }
        });
```

## HowTo: send cookies using `fetch`

The default value for `credentials` is `"same-origin"`. The default for `credentials` wasn't always the same, though. The following versions of browsers implemented an older version of the `fetch` specification where the default was `'omit'`:

 * Firefox 39-60
 * Chrome 42-67
 * Safari 10.1-11.1.2

If you target these browsers, it's advisable to always specify `credentials: 'same-origin'` explicitly with all fetch requests instead of relying on the default:

```javascript
fetch('/users', {
  credentials: 'same-origin'
});
```

## Do user's logout?

You can't rely on users logging out for security: others might come in and use their account when they leave the computer at the library. But, you need to provide users with an active choice of logging out of an app, so that they might switch between user accounts for example. And the default option is to have a session cookie, not save credentials on a strange machine.

[good discussion](https://ux.stackexchange.com/questions/57132/do-users-log-out)

### References 

* [Sessions and Cookies](https://auth0.com/docs/sessions-and-cookies)
* [MDN: Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
* [RFC 6265](https://tools.ietf.org/html/rfc6265#section-4.1)
* [Blog: "Just how many web users really disable cookies or JavaScript?"](https://blog.yell.com/2016/04/just-many-web-users-disable-cookies-javascript/)
* [sending cookies using fetch](https://github.com/github/fetch#user-content-handling-http-error-statuses)
* [default value of path or domain](https://stackoverflow.com/questions/43324480/how-does-a-browser-handle-cookie-with-no-path-and-no-domain#answer-43336097)