# HowTo: `content-type`?

## 1. use the same `content-type` for similar requests

For all requests of the same type. A response should never change its content type based on the server succeeding or failing in processing the request, for example.

It is not a problem if the same server program delivers a different content-type for different `pathname`s for example, as long as it always does so consistently for all requests to that path.

## 2. use both `content-type` and `X-Content-Type-Options: nosniff`

Any content served over HTTP "should" contain metadata about its type. This is necessary so that the browser/client knows what to do with the content it receives. If the content type header is an image, the browser will view it, if it is HTML, it will do the markup and execute any javascript code. For example, an attacker uploads a malicious *html file with a jpg extension*, essentially targeting users with older browsers. These olders browsers like IE6 are vulnerable to this attack because they make use of content sniffing. Content sniffing is a browser feature that tries to guess a file's MIME type by reading it's content.

If the server knows the content-type for its response, the server should specify both `content-type` and `X-Content-Type-Options: nosniff`. It is especially important when a  user can upload their own content on the server. It allows to protect website from **MIME Confusion Attack** which allows to attack website with custom content by allowing users to upload malicious code, which is then executed by browsers that will interpret files using alternate content types, such as implicit `application/javascript` and explicit `text/plain`. This can lead to a "drive-by download" attack , which is a common attack vector for phishing. Sites that host user-generated content should use this header to protect their users.

> X-Content-Type-Options only apply request-blocking due to nosniff for request destinations of "script" and "style".

Configuring your server to return the set `X-Content-Type-Options: nosniff` HTTP response header will instruct browsers that support MIME sniffing to use the `Content-Type` provided by the server and not interpret the content as a different content type. It allows to protect from **Unauthorized Hotlinking** which can also be enabled with Content-Type sniffing. When using hotlinking to resource sites for one purpose, such as browsing, applications can rely on listening to content and generate heavy traffic to sites for another purpose, where it may conflict with their terms of service, e.g. GitHub displays JavaScript code for viewing but not for execution:

However, content type is optional, and webmasters sometimes don't set it, which makes the browser think about the type of content it consumes. Therefore, browsers have had to implement parsing and "sniffing" techniques to detect content type when the content type header is not served. 

## Reference

* [Content_sniffing](https://en.wikipedia.org/wiki/Content_sniffing)
* [MDN: `X-Content-Type-Options: nosniff`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options)
* [XSLeak using `status` and `content-type`](https://medium.com/bugbountywriteup/cross-site-content-and-status-types-leakage-ef2dab0a492)
* [HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
