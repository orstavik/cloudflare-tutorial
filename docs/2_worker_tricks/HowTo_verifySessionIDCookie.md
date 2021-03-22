# HowTo: verify a sessionID cookie?

In a modern browser, you can rely on:
1. an `httpOnly; secure; samesite=lax` cookie will never be sent from that browser to any other server than your own, and always over HTTPS. You can therefore assume that if such a cookie follows a request from a modern browser, well then that user is logged into that browser.
2. if there is a `referer` header attached to the request, then that header has been automatically added by the browser, and is correct.
3. the `method` header of the request is added by the browser and is correct.

So, if the user's browser has been compromised, so that an attacker can for example extract the cookies in its register or create HTTP requests with modified `referer` or `method` headers, or if the user is using an (old) browser with a security problem, then things might happen, but if your user trusts a modern browser, then you can also trust these three headers.

## Why read with `GET` and write with `POST`?

We want our sessionID cookies to be sent with top-level navigation requests (`SameSite=Lax`). This enables the user to click a link, and have this request immediately send the cookie. All top-level navigation requests are `GET`.

However, with `SameSite=Lax` an html page or script loaded from another origin can programmatically initiate top level navigation. For example, they might call `window.open('your.domain/?change-password=hacked')`. If your server does not accept the origin of this other html page or script in its CORS whitelist, then the browser will not show the result of this script-driven top-level navigation to your page to the other script, but your server would still make it.

In short, CORS makes it "safe enough" (for most applications) to respond to `GET` requests with private data, but **unsafe** to allow `GET` requests to perform state-changing, write operations.

Thus, user authentication for *read* requests for private data can be verified using the sessionID cookie and an implied or explicit CORS whitelisting; *write* requests should not be allowed for top-level navigation, only for `POST` requests.

Todo. Issue. Is there any browser that will allow other pages scripts to pass cookie with `POST` requests?

## `referer`

But. We do not want to rely on `POST` and `SameSite` alone. We don't trust this security filter enough. And so we add an extra check: `referer`. The `referer` header is added by the browser to identify the location of the page/script that initiate the request. This is a protected header that modern browsers will not let any javascript or web page populate in any request (unless the browser has been tampered with as in extended, hacked, updated with a bug, etc.).

Thus, when receiving a request to either read or write private data, we can use the `origin` of the `referer` header to see if requests from that source are safe or not. This works very well when you are in control of the source that sends the request, as you can control that the request is allowed to append its origin in the `referer`. It doesn't work as well if the http requests come from sources that you do not control, as they might mask the `referer` in their requests.

todo. is it common for users to use browsers that do not display origin at all, not even to same site requests? no i think that within same-site requests, we are always safe.

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

## References

