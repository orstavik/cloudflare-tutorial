# WhatIs: `httpOnly` cookie?

## WhatIs: a cookie?

A cookie is a key-value data pair. The cookies are **automatically stored client-side** in the (long-term) memory of browsers; they are usually **not** stored server-side (although server-side apps often store cookies in order to track their users). Commonly, HTTP cookies are created by being set in the header of an HTTP Response going from the server to the browser, and then the same cookie is then returned from the browser to the server in subsequent the request headers. 

Web apps use cookies for *many* different tasks: remember selected elements, user preferences, registration data, location data on a web page. This state information is commonly referred to as a "session". 

In this chapter we will look at `httpOnly` cookies. `httpOnly` cookies are *stored in the browser*, but can *only be created, written, and read by the server*. Yes, you heard correctly! We are talking about small pieces of text that are 1) created by the server, 2) sent from the server to the browser, then 3) STORED in the browser(!!), and never read nor written too by any html element nor javascript, before 4) being sent back to the SAME server from which they came, and 5) possibly being altered there and sent back again. 

## Why: `httpOnly` cookies?
 
Cookies can do three things: 

1. Cookies can store state data on file. Ecce! Web apps in the browser can remember state even when the browser/ web app is closed using cookies.

2. All cookies are *automatically* sent from the browser to the server with each HTTP request. Ecce! Web apps running in the browser can share state information with web apps running on the server using cookies.

3. Cookies can *manually* be sent from the server to the browser. Ecce! Web apps running on the server can share state information with web apps running in the browser using cookies.

The purpose of `httpOnly` cookies is to create a session from the vantage point of the server. `httpOnly` cookies enable the server to identify that two or more HTTP requests come from the same browser. And, `httpOnly` cookies also ensure that no javascript in the browser might accidentally read this data or corrupt it. This makes `httpOnly` cookies a very good vehicle for [sessionID cookies](HowTo_sessionIDCookie.md).

## The life-cycle of an `httpOnly` cookie

The life of an `httpOnly` cookie most often begin when a web app receives a new request from a browser that does not provide it with a cookie. The server then recognizes that a 'new' browser is start to interact with it, and it sends the browser a `set-cookie` header with the response requested by the browser. The cookie is born on the server, and then immediately sent to the browser. 

When the browser receives the response from the server with the `set-cookie` the response, the browser then stores the cookie in its cookie register. This is the home of the cookie. Because the cookie is `httpOnly` the cookie does NOTHING while it stays in the browser, it is just there. 
 
Every time the browser sends a HTTP request to the same server, it checks its cookie registry to see if there are any cookies that "belong" to that domain/path. Cookies that belong to that domain/path, are then added as `cookie` headers to the outgoing request and sent from the browser 'to visit' the server.
 
The cookie is only staying with the server for a few milliseconds. But while visiting, the server can decide to mutate the cookie. It will then alter the content of the cookie and send it back as a new `set-cookie` response header.

The cookie dies when either a) the browser is closed and no `max-age` nor `expire` attribute is set, b) the `max-age`/`expire` timestamp expires, or c) the server send the browser a `set-cookie` header with `max-age` = `0` or `-1` (or an `expire` timestamp in the past).

> Cookies can also be created and mutated in the browser. As long as the cookie is not marked `httpOnly`, javascripts in the browser can create and change and kill cookies. This of course is necessary for cookies to contain state information about which items are placed in a shopping-cart, or which items the user has hovered with his/her mouse.
 
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

 - `expires` - date and time of expiration. By default, cookies are valid until the web browser session ends. **Do NOT use `expire`**, use `max-age` instead.

Session cookies are removed when the client shuts down. Cookies are session cookies if they don't specify the `Expires` or `Max-Age` attributes.

## References

 *