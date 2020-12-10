# WhatIs: CORS?

The web is *evolving*. Over time, new security measures have been added. And one the first security measures was *Same-Origin Policy (SOP)* (Netscape Navigator 2.0, ~1995). And then can came *Cross Origin Resource Sharing (CORS)* (~2009).

## WhatIs: Same-Origin Policy?

SOP's purpose is to restrict a third party script or web page from a) reading and using content on your server. Why? There are maaaany reasons, an we can look at one example. Let's say you have a small blog and you post a nice image on that blog. A celebrity reads your blog, sees your image, and decides to use your image directly in her blog. The celebrity doesn't make a copy of your image on her own blog, she simply uses a link to your web server. Then, 14.743.531 of her followers read the celebrity blog post, and they all must download the image *from your server*. Your little server is buckling under pressure, and your network traffic cost spikes. But you live. But, then, some followers starts using your image in their blogs too. And some of them are also celebs. Soon, as many requests are coming in to your little server per second as your blog would generate in its entire lifespan. Your server crashes, and your network budget has exploded. To avoid such a scenario, in addition to blatant misuse of databases, the browsers implemented SOP. SOP: you can't use the concept of the web to make the web. 

But. If SOP would block all requests that came cross-origin, the web would be frightfully restrictive and inefficient. After all, if you a) have an image or a database-to-json resource, that you b) really want to share with the world (or a select group of other servers), and c) the network bandwidth/budget to back it up, then SOP shouldn't stop you. Then, you would like to use the concept of the web to power your little island in the web. Then, SOP should not force you to make local copies of the same resource on all your servers neither. Enter CORS.  

## WhatIs: CORS?

CORS is the mechanisms by which *a server can actively tell a browser* that a resource is *exempted from SOP*. For example, a server can tell browsers that: a) an image can be used directly by another web page if that web page was loaded from another server origin; or b) a javascript file can be read and run by *all* other web pages and scripts.

The problem with CORS is that the browser cannot *in advance* separate between server resources that should a) remain protected by SOP and b) allowed to be used from CORS. SOP is default and blocks all cross origin collaboration, and so the browser is essentially forced to somehow verify that the server approves that a request can be used CORS.

The browser is faced with a choice: does the browser ask for permission first, and then start using that resource if allowed ("ask for permission")? Or does the browser get the resource first, and then ask for forgiveness second ("ask for forgiveness")? Most of the time, the browser and CORS "ask for forgiveness" (although it can for rare HTTP request types ask in advance too).  

Why? Why does CORS ask for forgiveness, and not permission? Well, the answer is quite obvious, although not super simple:

1. If the browser must ask the server for permission *in advance* every time it wants to make a cross-origin request, then all cross-origin requests would require *two* round trips to the same server (one for permission, and then one for the actual resource). 

2. Invalid cross-origin request should fail, always. This means that if a developer/blogger uses a json/image file from another server, then the developer/blogger will immediately see that their cross-origin request fails, and then next replace the json/image file with another resource that somehow passes the CORS test in the browser. SOP effectively forces everyone to clean their web pages and scripts invalid CORS requests, from the very beginning. What follows is that the vast majority of cross-origin requests in use on the web are valid (99%+)

3. Because almost all cross-origin requests are approved, and asking for permission takes twice the time, browsers assume that HTTPS requests made to cross-origin servers will be sanctioned by that server in the end. Therefore, the browser allows **third-party pages/scripts** will send common `GET` and `POST` requests to cross-origin servers, by default, and instead of blocking the request going out, the browser will **block the response from being passed from the network module in the browser and to the third-party page/script on the receiving end** if the response does not also include an `Allow-Access-Cross-Origin` header that explicitly whitelist the origin of the third party page or script that initiated the request. The browser essentially makes the query to the server on behalf of the script/page that runs inside it, but then if the server does not "forgive the request", the browser hides the result inside itself *before it should pass it to the requesting script/page*.

## HowTo: Work with CORS?

So. SOP and CORS leaves us with a puzzle: Browsers will let any third party page/script send a request to our site. Then, how can we know if the request is coming directly from the user (as in top-level navigation) or from one of our own scripts/pages?

When third party scripts and web pages can get browsers to issue HTTPS requests to our server with our `cookie`s, how do we separate good from bad HTTPS requests?

The solution is threefold:
1. add a `cookie` and restrict the browser's use of that cookie using the `SameSite` attribute,
2. check the HTTP requests' `referer` header, and
3. check the HTTP requests' `method` (`GET` vs. `POST`).

## CORS and `SameSite` `cookie`s

The `SameSite` `cookie` attribute can prevent the browser from appending a server's cookies to certain cross-origin HTTP requests (cf. [cookie](todo)). 

`SameSite=none` is default. This gives no protection to the `cookie` and will allow the `cookie` to be appended to all cross-origin requests, including cross-origin requests initiated by third party scripts.

`SameSite=strict` will only append the `cookie` to cross-origin requests that originate from a page/script loaded from the "same site". This protects the cookie from being sent with third-party cross-origin requests, which is good. But, this also prevents the cookie from being added to requests driven directly by the user  (top-level navigation), which is often bad.

`SameSite=Lax` will allow the browser only to append the `cookie` to requests coming from the same site and to `GET` requests that originate from (top-level-navigation-like requests). Essentially this means:
1. `POST` requests must originate from the same site to get the `cookie`.
2. `GET` requests that are triggered by normal, top-level navigation gets the `cookie`.
3. Most third-party, cross-origin `GET` requests, such as an `<img src="...">`, does not get the `cookie`. 
4. But, third party scripts that for example call `document.open('your.server.com', '_blank')` will also get the `cookie`, but these third party scripts should be blocked from reading the content of the request on the receiving end by SOP/CORS.

`SameSite=Lax` is often preferable to `SameSite=Strict`. The reason is that `Lax` will allow browsers to add the cookie to the initial HTTPS request during top-level navigation. This both a) speeds up loading of first page, b) avoids flashing content during load, and c)  simplifies web apps' architecture.

## CORS and `referer` and `method`

The `referer` is an HTTP header that the browser includes with some HTTP requests. In combination with a valid session token, the `referer`'s value can be trusted, but you cannot depend on it always being present (cf. [whitelisting](todo).)
   
The `method` of the HTTPS request, ie. `GET` or `POST`, is relevant when `SameSite=Lax` is used: 
1. if the request is `POST`, then the server knows the request is made from the same site. This means that if the `cookie` validates, the server can make state changes triggered by that `POST` request. 
2. if the request is `GET`, then the server knows that the browser will only show the result either directly to the user, or to a same-site script. A third party script might trigger the browser to make the request, in bad faith, but if the browser can't validate the request coming back from the server, then the browser will never pass the result of that query to the third-party script. This means that if the `cookie` validates, then the server could pass private data out with such requests, but it should never do any state changes based on such requests.

> The `typemustmatch` caveat: In addition to the restrictions above, the server should always return status code 200 for all 2xx, 4xx, 5xx response types, and *never* vary the `content-type` for the same request based on state or internal computation. Firefox ~62 can leak data based on `status` and `content-type` from `<object typemustmatch>` elements in third party scripts. This is not good.  
   

And this gives you the following eye-of-the-needle in which to filter your HTTPS requests securely:

1. If you have `SameSite=Lax`, then you will send your server's cookies with the very first HTTPS request when the user navigates to your page. That is nice. 
2. But, `SameSite=Lax` also means that modern browsers can be fooled to make and send *outgoing* HTTP requests *with your server's cookies* from *any a third party script* (cf. `window.open('yourserver.com', '_blank')`.
3. Unless you add a CORS header that allows this third party script to read and use this resource, the modern browser will protect your json file from for example being *read* by that unknown script, but CORS cannot protect your server from responding to the `GET` request.
4. However, `SameSite=Lax` will not let modern browsers add your cookies to `POST` requests, even when these `POST` requests come from top-level navigation.
5. Thus, CORS will protect data from being *read and used* by unknown third parties.
6. But, your server should *only* do state changes (write operations) based on HTTPS `POST` requests. 

## References

 * [The CORS of history](https://en.wikipedia.org/wiki/Same-origin_policy#History)


## old drafts

SOP works by blocking such requests in the browser **on the receving end**. Ie. SOP will *allow* a third party script or web page to *make and send* for example a GET request to your server, which can often also include any cookie you have associated with your domain/location. But, when the browser receives the result from your server, it will block the other web page/script from *using* that image or *reading* that json file.


First, your server should anticipate that third party scripts can send it requests. Second, your server should anticipate that  that a) contain the server's own `cookie` (or a `cookie` that looks like the server's own cookie. This applies both to `GET` and `POST` requests, **anybody can send an HTTP request to your server from a third party script in a trusted browser**.

Why? The key to understanding SOP, is that your server can attach a special CORS header (`Access-Control-Allow-Origin`) to your image or json file. This CORS header can explicitly tell Firefox, Chrome, and/or Safari that they *can* indeed share that resource with the third party script/web page. The browser does not know in advance if your server will allow scripts from other servers to use its images and/or read its json files. Therefore, the browser lets the cross origin script/web page make the request to your server, receives the result, and then based on the CORS permissions granted by your server hides it or passes it on to the third party script/web page that requested it.

But, why not ask your server *first* if it will let this other script/web page use that image resource or not? Why bother with the whole thing if the browser is only going to restrict access to the image/json file afterwards anyway? Well, to ask for things in advance takes more time. If the browser had to ask other server's if they could load a particular resource, then there would be two queries instead of one, for all requests. Making SOP restricted requests that are not later allowed by CORS is mostly a problem during development, and so 99% of all cross origin requests for images etc. are given CORS access.

So, SOP and CORS therefore works as follows. Cross origin resource sharing is only allowed if the server says it is ok. For most common requests, such as
, unless your server explicitly gives the browser your permission to share that image with that script/web page.  blocks other scripts and web pages from doing that in  brwo *in official widely used browsers such  CORS enable you to refer to your own images in your own web page, while at the same time making sure that others cannot use your images directly in their own web page, which could direct a lot of unwanted traffic to your server.

But, it would be frightfully inefficient and restrictive if servers were only able to serve resources such as scripts and images and json data.

CORS works by With security meassures being added along the way. One of these security meassures is  And more and more security breaches has been found along the

## WhatDo: CORS do?

But. Some of your resources are not accessed by nice `POST` requests with an even nicer `referer` header. The web is webby (a web page might contain references to scripts and images to different servers), and these requests are made using `GET` requests that has a `referer=null` header.

And another but. Your browser still would like to respond to such queries. The web page that sends the not so nice `GET` request with the missing `referer`, might still be supposed to use the resource (the host might still be in your CORS whitelist). Furthermore, even though the browser *do not* send the `referer` with the `GET` request, the browser might still include a nice, safe, secret, httpOnly cookie with the request. If you only could verify the `referer` at the same time, then you would happily give that request READ access to private user data.

The solution here is CORS. CORS enable your server to *outsource* the job of verifying the `referer` to the browser *after* the browser receives the private data. Your server can trust the browser that delivers the cookie. And the browser has all the information needed: the browser knows the missing `referer` in the `GET` header (the browser didn't send that information with the `GET` request only to protect the privacy of your user, it has it no problem), and the browser can read the headers of your server's response to see if that `referer` should have access to read data coming from your server. So, if your server does *not* add an `access-control-allow-origin` header that gives the hidden `referer` access to your resource, then the browser can block that data from being shown.

CORS is very strange security mechanism for sure. CORS blocks sensitive data *after* it has left the server inside the browser. This means that CORS gives some protection for READing data, but NO protection for illicit WRITing. So, in essence, CORS can be used to protect reading of non-super-sensitive user data, iff that request also contains a trustworthy cookie.