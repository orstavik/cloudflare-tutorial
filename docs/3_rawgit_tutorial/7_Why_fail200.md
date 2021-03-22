# Why: fail `200`?

This article argues for using `status: 200` code for both `errors` and `sucess`, ie. not use `status: 404`. Why? 

## 1. `typemustmatch`

Some older Firefox browsers (<68) implemented the `typemustmatch` attribute on the `<object>` element. In these older Firefox browsers, a XS attack can exploit the difference between `2xx` and `4xx` `status` codes. Here is a very short description of the attack:
1. A third party web page adds an `<object data="https://socialnetwork.com/editProfile/DonJohnson" type="text/html" typemustmatch>`.
2. Firefox <68 will dispatch an HTTP request to `https://socialnetwork.com`, and include `socialnetwork.com`'s cookies.
3. If `DonJohson` is logged in with that same browser, the `socialnetwork.com` server will return a `200` response; if not, the server will return a `404`.
4. Being protected by SOP, Firefox<68 will not show the content of the `<object>` element to the thirdparty script. But! Firefox <68 has a side-effect that will make it *alter the `width` and `height` of the `<object>` element if a) the response is a `200`, but not when the response is a `404`, and b) if the `content-type` differs from the `type` attribute value.
5. This means that the third party script could *make a guess* to see if a particuler user of `socialnetwork.com` was logged in, ie. if a particular user was watching the website.
* Firefox fixed this bug in v.68, but the leak is still active in older Firefox browsers. [XSLeak using `status` and `content-type`](https://medium.com/bugbountywriteup/cross-site-content-and-status-types-leakage-ef2dab0a492)

Don't be too alarmed. First, Firefox <68 is used by very few users today: say 5% uses Firefox, and say 5% of Firefox users uses a version affected by this leak. So, maybe around 1/400 of your users might be vulnerable here. Second, `typemustmatch` exploits do not leak super sensitive data. It is bad if third party websites can guess your identity like this, and the exploit can be used for worse actions than this too, but it is not the end of the world.

But. This weakness illustrates an attack surface: 

1. The HTTP packages exchanged between your server and your trusted browser scripts are *also processed by multiple middlemen*: 
   * browsers of varying types and versions, 
   * plugins and extensions in these browsers, 
   * third-party facilitating scripts in your own or a partner's web-site's service worker, 
   * logging services used by your server,
   * and more. 

2. These *middlemen* apps use HTTP `status` codes *actively*. And they might slip up. They might run a function which has a side effect that might somehow be discovered by third party scripts. Like Firefox <68 they their side-effects might differ based on the response being `200` or `400`.

The best way to protect your API server from being exposed by one such man-in-the-middle doing something stupid when he receives `4xx`/`5xx` responses is simply not to differentiate between `2xx` and `4xx`/`5xx`.

## 2. peripheral, normative function

The purpose of the `status` headers is peripheral and normative: 
1. Peripheral purpose means that the `status` header only serves a function for peripheral parts of your system, and *not* for essential parts of your system. The essential parts of your system is the server, the browser, and the script. Optional parts of your system is for example a logging service. (To run your system require all the essential parts, but none of the optional parts). The server, the browser, and scripts in your browser do not need to pay any attention to the difference between say a `404` and a `200` response, while the logging service puts the utmost attention to this property. However, the purpose of a `302` is not peripheral, but essential, as the browser will treat a `302` differently from a `200` or `404`. 
2. Normative purpose means that *other people* tell you to differentiate between `200` and `404` messages, even though you don't actually need it. Passing errors as `404` or `500` instead of `200` is the "right thing to do", but it doesn't really matter for your base use case.

The problem with peripheral purpose is that it exaggerates the role and importance of the *always present, essential property*. The essential purpose of all `2xx`, `4xx`, and `5xx` codes is just to pass the response back to the requesting page/script (after SOP/CORS verification etc.); the peripheral purpose of `4xx`/`5xx` vs. `2xx` in logging application is to prioritize a request/response-pair differently. Put simply, could `4xx` and `5xx` be replaced by an optional `log-priority: error` header today?

The problem with normative purpose is that it dilute developers' perception of system reality. How so? Well, the reality is that for all intents and purposes, the core system behaves the same when it receives a `2xx`, `4xx`, and `5xx` response: it simply passes the response body to the requesting page/script. Thus, the developer should perceive the system reality to be that there is *no practical difference* between these types of responses. The developer *should* see *no need* to wrap these messages in three different `status` codes (as long as the state of the message is put in the body of the response. But. *all the people around* the developer keeps telling him *how much better these HTTP responses look when they are wrapped in `404` or `500`, instead of a `200`*. The developer looks at the different types of messages and sees no difference in behavior. And he learns to distrust this (correct and simpler) view of browser behavior, and replace a proactive approach to HTTP response design with a reactive approach that adds system properties based on queues from others. The developer learns to believe that the (emperor) response isn't naked because it is wrapped in such nice codes (clothes). The reality, is that the response is "naked" and needs no processing when it is passed from the server to the browser to the requesting script under `2xx`, `4xx`, and `5xx` `status` codes.

For the browser, it doesn't matter if you mark the request with `404`, `200`, or `500`. All these status codes function like a comment written in code inside the browser.

## 3. code simplicity

When you return the "correct" `status` and `content-type`, you essentially split the state returned in the response in two layers (header and body). If your server always return one `status` code `200` and instead represent the state of the response in the body, you essentially pass the state of the response in one layer (body). We can exemplify this with this code example:

Solution that only use `status: 200` and `text/plain` always:

```javascript
const html = `
Hello sunshine!
<script>
(async function(){
  const link = Math.random() < 0.5 ? '/json': '/error';
  const data = await fetch(link);
  const json = await data.json();
  if(json.status === 'error')
    console.log('error');
  else if(json.status === 'ok')
    console.log(json);
})();
</script>
`;

async function handleRequest(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (path === '/error')
    return new Response(JSON.stringify({status: 'error'}));
  if (path === '/json')
    return new Response(JSON.stringify({status: 'ok', hello : 'sunshine'}));
  return new Response(html, {headers: {'content-type': 'text/html'}});
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

Solution that use "correct" `status` and `content-type`s:

```javascript
const html = `
Hello sunshine!
<script>
(async function(){
  const link = Math.random() < 0.5 ? '/json': '/error';
  const response = await fetch(link);
  if (response.status >= 400 && response.status <= 499) {
    const text = await response.text();    //implicit knowledge that 404 messages are text
    console.log(text);
  } else if (response.status >= 200 && response.status <= 299) {
    const data = await response.json();    //implicit knowledge that 200 messages are json
    console.log(json);
  }
})();
</script>
`;

async function handleRequest(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (path === '/error')
    return new Response(JSON.stringify({status: 'error'}), {status: 404, headers: {'content-type': 'text/plain'}});
  if (path === '/json')
    return new Response(JSON.stringify({status: 'ok', hello : 'sunshine'}), {status: 200, headers: {'content-type': 'application/json'}});
  return new Response(html, {headers: {'content-type': 'text/html'}});
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

To split the state of the response in two is not a big problem. But it becomes more and more significant as other details and complexities are added, both server-side and client-side. To juggle two balls in the air at the same time, is itself simple enough. But to juggle the same two balls in the air at the same time, while you also have to juggle one, two, or three more balls becomes that much more problematic. If you can justifiably put down ball number one from the very beginning, your chances of keeping all your balls in the air at the same time when somebody throws you that fifth ball grows exponentially.

## 4. operation/documentation by numbers

HTTP `status` codes are "operations/documentation by numbers". In the good old days of the internet (think 64kbps modem, Netscape Navigator 2, homepages, etc.), using status codes made a lot of sense. First, number codes required less memory space and network bandwidth than string names. Second, the internet originally served fewer purposes which more easily would fit in a list. Third, the internet had fewer different applications and technical cultures. It easier to define a list for 5 applications

But. Operations/documentation by numbers is an antipattern, even for HTTP response `status` codes. Why?

1. Often, use cases fall within two or more categories at the same time. For example, a request is made with an erroneous format (the original `4xx` sin), but the server crashed unexpectedly trying to tackle the bad input (a truly important `5xx` problem). You would be right and wrong if you put the error in either category; the good news is that you can always justify putting your response in any category, the bad news is that you will always do it wrong. 

2. Often, use cases fall between or outside existing categories. For HTTP response codes, this is especially true when it comes to "request compositions":
   * How to correctly describe bulk operations? What if one requests asks for three images and two css files? What if that request succeeds with two images and fails with the remainder?
   * What about chained/piped operations? What if the first stage of a request succeeds, but the second stage fails?

3. There are never enough numbers, and so the pull is to continuously extend the registry (cf. [404 substatus codes](https://en.wikipedia.org/wiki/HTTP_404#Microsoft_Internet_Server_404_substatus_error_codes)).

4. How to tackle emerging conventions? For example, existing convention dictate that when the server cannot find a result based on a request's `searchParams`, the server should respond with a `200: empty search result`; when the server cannot find a result based on a request's `pathname`, then it should respond `404: Page not found`. But. More and more web servers are moving their `searchParams` into `pathname`. The old `http://files.com/?user=TheDevil&filename=Details.txt` is now `https://files.com/TheDevil/Details.txt`. Why should the old version return `200: empty search result` and the new `404: Page not found`?

5. Conventions are meant to broken. And that is deliberatively confusing. For example: many services should return `404 Not found` when an unauthorized user tries to access a restricted resource, instead of `403 Forbidden`. The rationale is that the server would not like unauthorized users to even know that there is something forbidden on the server, the existence of an authentication protocol, etc. The convention is to lie.   
   
   Deliberate lying is much more likely to spoof a developer working with an honest, constructive mindset seeking correct, expected, self-evident behavior, than it is to confuse a dishonest attacker already seeking unexpected behavior. The problem with `403` vs `404` is:
      1. Alice the developer debugging Bob's error messages might spend an extra hour finding the bug because Alice believes her colleague Bob would not deliberatively lie by casting errors he must know to be `403` as `404`. 
      2. Casper the right-seeking developer sees categories such as `403 Forbidden` and dutifully implement all of them in his application. This is just great news for Dave the hacker who then can reverse engineer Casper's server simply by looking at the many different response `status` codes.
	
6. People disagree. People disagree what each number mean in general. And people disagree about which number should be used in particular cases. Why then use numbers? Why then not let every server-side developer explain his own functions and documentation in his own words? Numbers imply a universal character that do not exist in reality.

7. Having numbers often leads the developer of the server-side API to excuse obviously lacking documentation, to himself and others. "The response has a `status` code that points to a overall description of the problem", which the developer considers to be sufficient  documentation. Using universal `status` codes as vehicle for documentation simply casts a shadow over the need to document an API properly and specifically.

8. Conventions both enable and restrict. First, HTTP `status` codes encourage atomic requests and discourage composed requests. Second, HTTP response `status` codes enable a lot of functionality in generic logging services that can therefore simply be appended to a diverse array of servers; but, logging based on `status` codes also conflicts with broken conventions, composed requests, etc. and can lead the developer into fashioning his log to fit the need of the logging service, and not the need of his application.  

Javascript has rejected the pattern of using numbers to categorize errors (cf. old IE's `Error.prototype.number`s). Instead, Javascript gradually evolves a list of conventionalized, self-explanatory phrases (cf. [mdn list of errors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors#List_of_errors)).

## SEO and "soft 404"

This article basically advocate actively using "soft 404". Crawlers such as `Googlebot` and `Bingbot` also use `status` codes such as `404` and `500` to identify broken links.

However, there are several aspects to consider here:

1. `404` fixes the symptoms of a problem. Other approaches such as turning *every* missed request into a *search*, in essence considering your service a searchenging, can often be far more appropriate.

2. Serious crawlers such as `Googlebot` handle "soft 404s". They have to, the web is already filled with them. Do you really want or need to adopt to other robots?

3. You don't really control robots based on your status codes. If you need to control and limit robots, you should use `robots.txt` as well as having your server (provider) block problematic requests.

To make your "soft 404" errors easier to recognize for robots, add `Error: 404 Page not found` as part of your error message.

## Insecure HTTP and `status` code

In the good old days, when the web was pure, innocent, insecure, and unencrypted, the `status` code could be read among many posts along the way. That meant that firewalls could block/filter out `4xx` responses (to save bandwidth?), and that developers could debug systems by intercepting, logging and reading HTTP packages along the way).

Having `status` codes here meant more opportunities for men-in-the-middle. Mostly for bad. However, this history of transparency of messages in traffic in the old web might be useful to understand original intent and purpose of the `status` codes. 

## Refence

* [XSLeak using `status` and `content-type`](https://medium.com/bugbountywriteup/cross-site-content-and-status-types-leakage-ef2dab0a492)
* [HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)