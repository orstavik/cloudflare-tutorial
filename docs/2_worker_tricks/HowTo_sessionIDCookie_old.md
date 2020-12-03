
## Rolling cookie

**Rolling cookies** is a particular type of RememberMe cookies. Rolling cookies create rolling sessions, a session
whose TTL is automatically extended while the user is active.

To create a **rolling cookie**, the server/worker sets a 'medium' `Max-age`: for example 4 hours (a long lunch break)
or 10days (a short holiday). While the user remains active, this timeframe is continuously pushed into the future
every time the browser interacts with the server. This is achieved by the cloudflare worker *always* sending the
browser an update cookie with an updated `Max-Age` attribute. The cloudflare worker must keep track internally to for
example only update Rolling Cookie upto a rolling cookie `Max-Age`. This functionality the cloudflare worker must
implement itself, there is no support for it in the HTTP cookie standard. (It is of course possible to only update
the session once for example it is halfway spent: for example only give a new 4 hour session once the current rolling
session has less than 2hours left on the clock. Such a simple check can dramatically reduce the network overhead
needed to extend the rolling cookie on each interaction).


## Demo: Cf worker setting and getting secure sessionID cookie

```javascript
function html(txt) {
  return `
<h1>${txt}</h1><br>
<a href="/logoutCookie">logoutCookie</a><br>
<a href="/forgetMeCookie">forgetMeCookie</a><br>
<a href="/rememberMeCookie">rememberMeCookie</a><br>
<a href="/rollingCookie">rollingCookie</a><br>
<a href="/${Math.random()}">hello sunshine</a><br>`;
}

const secureCookieSettings = {
  Domain: '2js-no.workers.dev',
  Secure: true,
  HttpOnly: true,
  SameSite: 'Strict'
};    //remember, NO support for HTTP TRACE from your server!!!

function getCookieValue(cookie, key) {
  return cookie?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`)?.pop();
}

function cookieToStr(cookie) {
  return Object.entries(cookie).map(([k, v]) => k + '=' + v).join('; ');
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const [ignore, action] = url.pathname.split('/');

  //setting normal cookie
  const cookie =
    action === 'logoutCookie' ? {iat: Date.now(), 'Max-Age': 0} :
      action === 'forgetMeCookie' ? {iat: Date.now()} :
        action === 'rememberMeCookie' ? {iat: Date.now(), 'Max-Age': 60 * 1} :
          undefined;
  if (cookie) {
    const fullCookie = cookieToStr(Object.assign(cookie, secureCookieSettings));
    return new Response(html(action + ' cookie: ' + fullCookie), {
      status: 201,
      headers: {'Content-type': 'text/html', 'Set-Cookie': fullCookie}
    });
  }

  //setting rolling cookie
  const cookies = request.headers.get('cookie');
  const iatString = getCookieValue(cookies, 'iat');
  const [iatDate, maybeRoll] = iatString?.split('.') || [];
  const iat = new Date(parseInt(iatDate || Date.now()));
  const roll = maybeRoll === 'roll';
  if (roll || action === 'rollingCookie') {
    const cookie = {iat: Date.now() + '.roll', 'Max-Age': 60 * 1};
    const fullCookie = cookieToStr(Object.assign(cookie, secureCookieSettings));
    return new Response(html('rolling cookie: ' + iat.toUTCString() + fullCookie), {
      status: 201,
      headers: {'Content-type': 'text/html', 'Set-Cookie': fullCookie}
    });
  }
  return new Response(html('hello cookie: ' + iat.toUTCString()), {
    status: 201,
    headers: {'Content-type': 'text/html'}
  });
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

The demo worker has three handles: `/setCookie`, `/deleteCookie`, and everything else.

1. when the worker `setCookie`, it adds a `Set-Cookie` header to the response with a expiration date 1 day into the
   future. This is typically done when the user logs in.
2. when the worker `deleteCookie`, it adds a `Set-Cookie` header to the response with an expiration date set to *now*.
   This will remove the cookie from the browser, and is typically done when the user logs out.
3. all other requests to the worker, will simply make the cookie worker print out the content of the cookie it receives
   from the browser.

## WhatIs: RememberMe or ForgetMe or Rolling cookies?

> Session cookies are removed when the client shuts down.
>
To make the browser either forget the session when the browser window closes, or remember the user's login even while
the browser is shut down, use the `Max-age` attributes on `Set-Cookie`. The value of `Max-Age` is a TTL number in
seconds after last `Set-Cookie` directive in a response.

> `Expires` is an older alternative to `Max-Age`. It require a more complex Date UTC format value (`new Date().toUTCString()`), and is always overridden by `Max-Age` when both attributes are set.

1. **ForgetMe cookies**, aka. **session cookies**, are delete by the browser every time the full browser window with
   that cookie is closed by the user (closing a tab in a window is not enough to forget a session cookie). To create
   a **forgetMe** cookie simply do NOT set neither `Max-Age` nor `Expires` attributes on the cookie.

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

2. **RememberMe cookies**, aka **permanent cookies**, are saved by the browser even when the browser closes that browser
   window. The browser deletes the cookie when the `Max-Age` is reached. To create a **rememberMe** cookie, set
   a `Max-age` several days into the future, for example 1 day or 30 days. If the browser has already set a rememberMe
   cookie, do not set the cookie again.

To prevent the user from having to enter his password every day (after the session ends), it is customary to remember
that he is authorized in a cookie.

Usually, cookies set for a certain period (for example, a month) or permanently. In the second case, the user will be
logged in (i.e. he will be able to log in without entering his password) until he clicks the 'Logout' link or accesses
the site from another browser.

How can this be implemented correctly? The principle is as follows: a random string should be written into the user's
cookie and simultaneously into the database.

- The first thing we do when entering the site is to check if the session is running. If it is running, the user is
  authorized. If it is not, then we look at the cookie and look there for a note about authorization.
- If a cookie is marked, then we shall search the database for a user with such login and check whether a random string
  from the cookie matches a random string from the database for that user.
- If it matches, we shall authorize it, i.e. start the session (the same procedure as for login and password
  authentication).
- If there is no match, we shall show him the authorization form.
- When authorising by login and password, we shall write a random line to the user in a cookie and a database. This
  shall be done only if the user has ticked the 'Remember me' box. Why? Because the user may not be at his computer and
  therefore does not want another person after him to be able to log in under his cookie login (i.e. without entering
  the password!). Therefore it is always worth giving the user a choice - he wants his browser to remember him in a
  cookie or not.

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

**RememberMe cookies** should not last infinitely. If a **RememberMe** cookie is set up to last for 365 days, then if it
leaks, a leaked cookie might be valid for many months. To avoid such problems, **rolling cookies** can be used.

3. **Rolling cookies** is a particular type of RememberMe cookies. Rolling cookies create rolling sessions, a session
   whose TTL is automatically extended while the user is active.

   To create a **rolling cookie**, the server/worker sets a 'medium' `Max-age`: for example 4 hours (a long lunch break)
   or 10days (a short holiday). While the user remains active, this timeframe is continuously pushed into the future
   every time the browser interacts with the server. This is achieved by the cloudflare worker *always* sending the
   browser an update cookie with an updated `Max-Age` attribute. The cloudflare worker must keep track internally to for
   example only update Rolling Cookie upto a rolling cookie `Max-Age`. This functionality the cloudflare worker must
   implement itself, there is no support for it in the HTTP cookie standard. (It is of course possible to only update
   the session once for example it is halfway spent: for example only give a new 4 hour session once the current rolling
   session has less than 2hours left on the clock. Such a simple check can dramatically reduce the network overhead
   needed to extend the rolling cookie on each interaction).

> The idea is that a cookie value should store both the value of the last update and the cookie value separated by `.`.

```javascript
function getCookieValue(cookie, key) {
  return cookie?.match(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`)?.pop();
}

async function handleRequest(req) {
  const url = new URL(req.url);
  const [ignore, action] = url.pathname.split('/');
  const maxAge = 60 * 1;
  const cookies = req.headers.get('cookie');
  const iatString = getCookieValue(cookies, 'iat');
  const [iatDate, value] = iatString?.split('.') || [];
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

Just set the cookie on exactly the same name, path and domain, but with an `Expires` or `Max-Age` value in the past. The
server will be successful in removing the cookie only if the `Path` and the `Domain` attribute in the `Set-Cookie`
header match the values used when the cookie added. Setting on exactly the same path is important. Many starters fail in
this by using only the same name and domain and relying on the current request URL for the default path.

```javascript
        const myDomain = 'https://my-domain.workers.dev'
//add cookie
return new Response("cookie added", {
  status: 201,
  headers: {
    'Set-Cookie': `myCookie=helloSunshine; Secure; HttpOnly; SameSite=Strict; Path=/; Domain=${myDomain}; Max-Age=${60 * 1};`
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

The default value for `credentials` is `"same-origin"`. The default for `credentials` wasn't always the same, though.
The following versions of browsers implemented an older version of the `fetch` specification where the default
was `'omit'`:

* Firefox 39-60
* Chrome 42-67
* Safari 10.1-11.1.2

If you target these browsers, it's advisable to always specify `credentials: 'same-origin'` explicitly with all fetch
requests instead of relying on the default:

```javascript
fetch('/users', {
  credentials: 'same-origin'
});
```

## Do user's logout?

You can't rely on users logging out for security: others might come in and use their account when they leave the
computer at the library. But, you need to provide users with an active choice of logging out of an app, so that they
might switch between user accounts for example. And the default option is to have a session cookie, not save credentials
on a strange machine.

[good discussion](https://ux.stackexchange.com/questions/57132/do-users-log-out)

### References

* [Sessions and Cookies](https://auth0.com/docs/sessions-and-cookies)
* [MDN: Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
* [RFC 6265](https://tools.ietf.org/html/rfc6265#section-4.1)
* [Blog: "Just how many web users really disable cookies or JavaScript?"](https://blog.yell.com/2016/04/just-many-web-users-disable-cookies-javascript/)
* [sending cookies using fetch](https://github.com/github/fetch#user-content-handling-http-error-statuses)
* [default value of path or domain](https://stackoverflow.com/questions/43324480/how-does-a-browser-handle-cookie-with-no-path-and-no-domain#answer-43336097)
* https://stackoverflow.com/questions/15932957/difference-between-0-and-negative-value-for-setmaxage-for-cookie