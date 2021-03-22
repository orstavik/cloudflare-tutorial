# WhatIs: a SessionID?

> Session: a set of interactions between f.x. a user and an application that take place within a given timeframe.

A sessionID is an identifier of a session that include functions both on the server and in the browser. To secure a sessionID, the server and the browser must therefore keep that sessionID:
1. **secret**,
2. **usable in safe contexts**, and
2. **unusable in unsafe contexts**.

The server code is commonly well protected. Thus, keeping the sessionID secret and usuable in all the right contexts, while at the same time being unusable in a different context is not much of a problem: the Synchronizer pattern or AES256-GCM encryption will do the trick.

However, when the server shares the sessionID with the browser, things gets a little more complicated. To keep the sessionID usable, it needs to be persisted by the browser, even while the browser/computer is turned off. In addition, it needs to be sent between the server and the browser, so that the sessionID can be coordinated in both contexts.

**Cookies are usable** in safe contexts. First, cookies are *automatically*  handled by the browser (while manually processed by the server). In all safe contexts, the browser will receive, persist, and send to the server any sessionID it is given as a cookie.

**The problem with cookies is to make them unusable** in all the unsafe context. How to stop the browser from letting unsafe scripts and pages from:
1. reading the content of the sessionID (keep it secure), and
2. not be able to use it from unsafe contexts?

## `secure`, `httpOnly`, and `SameSite`

There are three properties for cookies that can be used to make them safe:

1. `secure` ensures that the cookie will only be transported between the browser and the server via SSL. This ensures that noone can access the sessionID in transport.

2. `httpOnly` ensures that no javascript can access the cookie while the browser has it. This ensures that the cookie remains a secret from nepharious scripts in the browser.

3. `SameSite=lax` partially ensures that only pages or scripts served directly/laxly from your own server are allowed to attach this cookie to subsequent requests made to your server. All other pages/scripts that trigger an HTTP request for a resource on your server are unsafe, and the browser will not append the cookie to any requests they make.

## The difference between `SameSite=lax` and `SameSite=strict`

`SameSite=strict` attaches the cookie *only* when the request is made from an html page and/or javascript that themselves are loaded from your server. This means that top-level navigation such as link clicks do not get your cookie. The downside of not adding cookie to top-level navigation is that you must have two roundtrips between server and browser: first you request the page without a cookie, and then your page will make a second request with the `strict` cookie to obtain the user data (for example as a json file).

`SameSite=lax` attaches the cookie in the same situations as `SameSite=strict`, but it also attaches the cookie during top-level navigation. This means that the cookie is sent when the user clicks a link, and the server can fill the page with suitable content. However, this means that the `SameSite=lax` can also be triggered by other scripts in calls such as:

```javascript
const hack = window.open('https://inn.ocent.com/?password=omg', "_blank"); 
hack.close();
```

## `referer` and `method` for extra protection

The browser doesn't only populate the `cookie` header automatically, the browser also automatically define the `request.method` and `request.header.referer`.

One way to use `referer` and `method` server-side is:
1. if the server receives either `GET` or `POST` requests that has a valid sessionID cookie, the server will grant that request *read* privileges to private user data.
2. if the server receives a) a `POST` request with b) a *whitelisted* `referer` and c) a valid session cookie, it will grant that request both *read* and *write* privileges.
3. if the server receives a request without a valid sessionID cookie, or that doesn't fit either (1) or (2), then it will not grant any *read* or *write* privileges to any private user data.

```javascript
const refererWhiteList = ['example.com', 'db.example.com', 'auth.example.com'];

function toWriteOrNotToWrite(req){
  const referer = req.headers.get('referer');
  const refOrigin = new URL(referer).origin;
  return validSessionIdCookie(req) && req.method === 'POST' && refererWhiteList.indexOf(origin) >= 0;
}
```

## off `CORS`. We had to go there.

It is important that the server doesn't grant any extra `CORS` privileges to any secure *read* operations described above. The reason for this is that `CORS` is an added security layer. If a hacker script somehow managed to trick a browser into making a request that included a valid cookie and a wrong `referer` listing, or you made a mistake in one of your server-side checks, then `CORS` might still block your attacker from reading the result of the authorized, nepharious request.

> `CORS` is a mechanism in the browser that essentially will let scripts and html elements in the browser *make* and *send* HTTP requests to the server, but then when the result come back from the server, *HIDE IT* from the html page if the result does not have an `Access-allow-cross-origin` header that matches the domain of the resource making the request.
>
> The key principle of `CORS` is that the blocking happens *after* the request is made. This means that if the server do not filter based on referer, then the server will perform the action requested and it is the browser that receives the data that chooses *NOT* to share its data with the js or html app.
>
> Why do it this way? It is a safety meassure implemented by the browser *after* the servers had made their resources wide open. It is ductape.  

## WhatAbout: logout?

For sessions that are terminated when the browser is closed, a logout button might seem redundant. But, if a `"remember me on this computer"` has caused the browser to persist the session state in for example a cookie, you need a logout function to actively remove this session state again. So, a logout button is both necessary and desired as part of protecting the user state.

Logout is often also the mechanism for switching user. If you don't provide a "switch user button", then a "logout, then login" routine will complete the same usecase and should be a recognizable pattern for your users.

However, users often forget to logout. Or believe (correctly or erroneously) that closing the browser window/tab will log them out. So you can't really rely on a logout button as a failsafe, fallback security mechanism. Always assume your users will log out incorrectly/forget to log out, and that another user might get access to their session.

[good discussion](https://ux.stackexchange.com/questions/57132/do-users-log-out)

## Conclusion

Ok. So we have the following solution for sessionID in the browser over `HTTPS`.
1. **anonymous read or write**: the referer of the request is checked against a CORS-whitelist. For requests coming from **outside domains**, an `Access-Control-Allow-Origin` with the whitelisted domain is added. 
2. **private read** requests: server checks an `httpOnly, secure, SameSite=lax cookie`, with NO `CORS` headers.
3. **Write** requests: server checks an `httpOnly, secure, SameSite=lax cookie`, and checks that the request has `POST` method and a whitelisted `referer` header.

The question is, can we trust this solution? And if not, why and when?
Can we trust the that the browser:

1. HTTPS ensures that neither the `cookie`, `referer`, nor `method` headers stay secret and cannot be tampered with.
2. `httpOnly`, `secure` and `SameSite=lax` ensures that the sessionID stay hidden from any prying scripts and are not sent inadvertently to any other server.
3. Checking `referer` and `method` on the server ensures that CSRF requests cannot be triggered by any other scripts or pages the user happens to open up in his browser.

So, what are we missing? Why do we need CSRF tokens?
* old browser that doesn't support `secure` or `httpOnly`?
* we should set the `referer-policy` to `strict-origin-when-cross-origin`

### References 

* https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite#Lax
* https://web.dev/referrer-best-practices/
* https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
* https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
* https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name
* [you can spoof `document.referrer`](https://jsfiddle.net/bez3w4ko/)
* https://stackoverflow.com/questions/50732159/how-to-pass-csrf-token-from-server-to-client

* [Sessions and Cookies](https://auth0.com/docs/sessions-and-cookies)
* [MDN: Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
* [RFC 6265](https://tools.ietf.org/html/rfc6265#section-4.1)
* [Blog: "Just how many web users really disable cookies or JavaScript?"](https://blog.yell.com/2016/04/just-many-web-users-disable-cookies-javascript/)
* [sending cookies using fetch](https://github.com/github/fetch#user-content-handling-http-error-statuses)
* [default value of path or domain](https://stackoverflow.com/questions/43324480/how-does-a-browser-handle-cookie-with-no-path-and-no-domain#answer-43336097)