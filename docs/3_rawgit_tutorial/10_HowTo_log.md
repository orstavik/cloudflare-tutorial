# HowTo: log?

The server-side log (here: "Log") is a record of HTTP request/response pairs. When a web app is used, adding all the data in every request/response pair to the Log would produce a huuuge amount of data that would be extremely costly. Therefore, you must **filter** the Log:
1. What do you need to log?
2. What is the priority of the data you log?
3. How long do you need to store the data? 10days for a short burst analysis, errors should be checked every month and stored for 3 months?
4. What data do you need from the request and response?  

## WhatTo: log?

What you need to log varies with:

1. **The app**. If your app is fueled by ads, then you might need to focus your logs on where your requests are coming from. Both externally and internally within your app. If your app is an intranet tool for a company, you might be more interested in what your users asks the server, ie. the text body of your requests.

2. **Project platform**. Your project might be a prototype, the first of its kind. In such instances, you have many unanswered questions about your apps behavior, and you would need to log both app behavior and user behavior. Other projects are clones of tried and tested solutions, and you have less need for logging app behavior and can focus more exclusively on user behavior. 

3. **Developer and system manager preferences**. Some like to log a lot, just to be sure. Some pay for the log themselves, and are more selective. Some are less confident in authentication, and wants to log authentication heavily; others are less confident in their database, and wish to log that extensively. Whatever your flavour, fit the log to your needs.

## HowTo: Analyse logs?

The log is reviewed after the fact as a means to understand what happened. The Log is a record of a single/sequence of actions. You most likely will need to filter the log based on the IP adr/user identity of the browser actor, the paths, the response status, timestamps, etc.

## WhatIs: log priority?

Some categories for log filtering recur so often that they seem universal: **log priority**. In JS, we have `console.log`, `console.error`, `console.info`, and `console.warn`. 

**Error** is high priority. Errors must be logged both during development and in production. You shouldn't have many errors, errors should be unknown and unexpected, and while you may anticipate that a crawling bot or something else might cause bugs in your system from time to time, you should try to keep the error log short. When you have inspected, cleared, and/or fixed all errors, you likely wish to clear all error messages so as to improve user privacy, reduce cost, and improve your next "error log bug hunt".

**Log** is lower priority. Log describes expected behavior. And therefore, the "log log" can produce a lot more data than the error log. Log is most likely only relevant during development, and is likely turned off in production. As with the error log, once the app goes into production and/or the log has been read and checked, you would likely want to clear the log table to improve your next "log bug hunt".

The log vs. error priority level matches fairly well with two dichotomies: "in development" vs. "in production", and expected vs. unexpected behavior. Now. To dig deeper, we could try to make priority levels/categories for beta testing, a/b testing etc. But. This is imho unhelpful. A better perspective is to add *analysis* as the third priority category for logs.

**Analysis** is an in-production log of expected behavior for a specific selection of interactions. The purpose of the *analysis* is to provide an overview of a *sequence* of user interaction that otherwise would be difficult to meassure. You the developer might expect and understand each interaction, but you do not know a) how individual sessions evolve over a period of time, or b) how user choices statistically spread out for a particular function.

The **analysis** essentially log **expected behavior in production**. And commonly, this is considered something you do as an activity against the log once it has been written. But. The problem with logging is too much costly data. And so, **analysis should be considered *before* the log is written**. Sure, if you have enough resources, log everything and analyse afterwards. But if not, I recommend thinking about **log analysis** at the same level as you consider logging expected and unexpected behavior.

> The common log log thus becomes an unfiltered **analysis log**. 

> By logging and analyzing a few users and/or a few pages in depth, rather than logging *all* pages for *every* user, you might reduce the size of your log to 1% or 0.01% of the size of a full log, while still maintaining a useful dataset for your purpose.

> From the good old days, the log hierarchies are deep: FATAL, ERROR, WARN, INFO, DEBUG, TRACE, ALL, etc. My advice is not to think about logging in this way, but instead work on your need to analyze your log.

> Having different tables for different log priorities can be beneficial as it would enable you to simply delete all entries by replace an old large table with a new empty table. This might be simple to do via a control interface, and it might be more cost efficient.  

## How long to log?

You should fix your errors frequently (once a month?), but in case you get hit by a bus and don't come back to work for a few months, you should keep your error log for longer.

> Log. The warn and error and log priorities stipulate how long the ttl and whether the log is active or not. Error (log and ttl 30days). Warn (log and ttl 10days). Log (sometimes log and ttl 3-7days). For example.

## Log tables

You get the following tables:
**ERROR**
**LOG** (used )

## What to put in the log table.

Each write/read operation to/from KV takes roughly ~20ms. However, as logs can be written asynchronously after the response is sent back to the browser, the wait for logging is not really a big concern.

The cost for key Cloudflare KV operations are (in micro-dollars: 1¤ = 1/1000000$ = 1 millionth$):

 * **WRITE**: 1 entry = 5¤      (put key+metadata+value)
 * **LIST**: 1000 entries = 5¤  (get key+metadata)
 * **READ**: 1 entry = ½¤       (get value for given key)
 * **store**: 1$ per 2gb/mnth  
	 * **ttl 60days**: 1¤ per 1kb (full key+metadata = 1,5kb = 1,5¤)
	 * **ttl 7days**: 1¤ per 8kb 

To reduce time/cost try to add frequently used data in the key and metadata of each entry.

The size limits of each entry are:
1. `key (string)`: Maximum 512bytes = 128 ascii chars.
2. `metadata (object)`: JSON.stringify(metadata obj) cannot be more than 1024bytes i 256 ascii chars.
3. `value (string)`: (max 25MB). But, the reality here is that storing is expensive. If you add 1000 log entries of 25mb, it costs 12,5$ per month to store them. So, you should store as little in the value as you can get away with. Here, the point of workers being as pure functions as possible will help. If you know that your worker always returns the same output for a given input, then you don't need to store any output data at all, if the response `status` is `ok`.   

Pricing example:

* To write and store an `error` log. Each entry is ~9kb of data with ttl 60days. Your system produces 150 error messages per day.
	* Each `log` entry costs: 5¤ to write + 9¤ to store = 14¤.
	* 150 entries * 30 days * 14¤ = 4500*14 = 63000¤ = 0.063$.

* To write and store an `log` log. Each entry is ~2kb of data with ttl 14days. Your system produces 150.000 messages per day. Your log is active for 14days.
	* Each `log` entry costs: 5¤ to write + 1¤ to store = 6¤.
	* 150000 * 14 days * 6¤ = 12600000¤ = 12.6$.

 * One analysis session. You list 300.000 entries, and you read the content of 3000 individual entries: 300 list queries + 300 reads = 300 * 5¤ + 300 * 0.5¤ = 330¤ = 0.00033$ = nothing.

As long as you only read the data when you look at it, reading data is practically free. Logging events that do not occur as a consequence of regular use, is also practically free. As long as data is <500kb, the price of storing this data is small. The thing that really drive cost is logging every day interaction, all data going into and out of the worker. If not restricted to either shorter time intervals and/or a sample of all users, the cost here will likely and quickly outweigh the benefit.

## What to put in the log table.

To get an idea of the data we would like to store and how, we can look at some other role model logging apps in the cloudflare worker universe:

1. `wrangler tail` logs a) status, b) any exceptions thrown, c) any messages sent to console.log/error [msg, log/error/warn, timestamp], d) full request object as json.

   The wrangler tail illustrate the potential of logging `console.log/error/warn` output. Instead of creating a special structure for for example session objects, we can instead simply log them. 
   
   However, another strategy to achieve a similar strategy is to add properties to the request object of the fetch event. a) This strategy produce significant benefits in terms of associating each `console.log` with the right fetch event (since many requests and responses might be handled concurrently by a single worker. b) doesn't require any method. c) is better suited to illustrate the state of the input (that you do want to focus on) as opposed to the imperative nature of js operations (that you do not want to focus on).  

   Thus, for example a sessionObject, that is extracted from a session cookie, should be appended to the request object as a property, and logged from there, as opposed to being written out in a `console.log()`.

2. `logflare.com` logs a)timestamp (and most likely a unique id per ms), b) request method, c) response status, d) path, e) user-agent.

The key:
1. timestamp       (13 digits)
2. uid             (6 digits?)
3. status          (3 digits) 
4. Get/post method (1 letter G/P?)
5. colo            (3 letters)
6. cf-request-ip   (15 digits? or 12?)
7. pathname        (unknown (max length?))


The metadata:
7. console.error   (unknown)
8. referer
9. user-agent
which other headers do we need?

For a log purposes, the wrangler tail output is only a full value. It lacks a `timestamp` and `uniqueid` for the log entry itself (although this can be read from properties such as the `cf-request-id`).
                   


Each log entry comprises of three parts:

When you read the log, you can list the key+metadata for 1000 entries at a time. To read the value of a specific entry, you must do a read.  Thus, you would like to store all the essential data as either part of the 
Timestamp+uid-path-ip-uid. requestMethod, requestBody, colo, geographic info.

* `key`: `timestamp+uniqueRequestId (which becomes the unique log id), path(how many letters), ip, loggedInUid, referer, status, method,` (max 128 short utf8 chars)
* `metadata`: `requestBody, colo, geographic, short version of responseValue` 

* `value`: `{request, response, serverData}`.
  Cloudflare wrangler tail doesn't log the response. It only logs the request and the status of the response. It separates error as a separate field. It doesn't parse/log any custom user id.

## worker to log
     
write
1. each worker that needs to log, writes directly to his/her own blog.
2. you start and stop the blog using a global setting
                                                     
read 
2. you create a separate worker to read the data. Here, you add a simple filter. And you choose which kv table to view. and you do your own stuff here. Essentially, you take control of the logging interface and control it from js code either in the worker or the browser.

## Pros/cons logging with Cloudflare KV store

1. having only one service, even though it will contain more than one table is simpler to manage.

2. you don't get a good user interface, so you must write your own tools to inspect your log.

3. It is simpler to access and log variables that is not something you wish to pass out of your main server, such as uid.

4. It might be cheaper.

5. More efficient.

## Reference

