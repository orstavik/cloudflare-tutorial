# WhatIs: state and sessions.

## WhatIs: mutable or immutable state

Whenever you work with state, you have one important choice to make: immutable or mutable?

The technical benefit of mutable state over immutable state, is that it is memory efficient. You don't need to save a lot of data, because when the state changes, you can simply change a value in your commonly quite small data structure. For one hundred changes of a state property, only one variable state property must be stored in memory, while an immutable state must store a long list of one hundred entries that describe the full state change. 

Another perceived benefit of mutable state is conceptual simplicity. If you look at the state at any one particular point in time, it can easily be perceived as a cluster of variables.

But. The perceived simplicity of mutable state is a mirage. As the app is used over time, state as a cluster of variables is particularly vulnerable to a) race conditions and b) emergent, edge case complexity. 

Race conditions occur when your state is written to and read from by different functions at the same time. One function in your app conglomorate might be delayed in while writing to the state object, and so another functions comes in and either reads the state while it is still only half complete, or write its considered state in a position that the delayed function will next overwrite erroneously. Such race conditions are very common: they arise when your state needs to be transported between locations and/or when functions that mutate the state run in parallel.
 
Emergent, edge case complexity arise when a sequence of related actions are made that the developer didn't imagine or didn't implement correctly. Sometimes, an app might accidentally tackle such an edge case and thrive. But, often, these new use cases causes the state to contorted into an illogical shape that crash with the surround app logic. Commonly, these are breaking changes for an app with a mutable state.

Faced with race conditions and emergent, edge case complexity an immutable state fares much better. Race conditions for mutable state can be broken down into three sub-problems: a) partial reads, b) wrong order writes, and c) data is overwritten and lost. Apps working with immutable state also face the problem of a) partial reads and b) wrong order writes, but they do *not* face the problem of c) overwritten, lost data. And this is a big win, as most race conditions problems can be bypassed fairly successfully and easily as long as all the data is there. Immutable apps that struggle with race conditions most often feel clunky and old school, but safe. Mutable apps that struggle with race conditions feel buggy and unsafe. 

Faced with emergent complexity, developers working with immutable state also fare better. First, an immutable state holds a record of past state changes, and so when a unforeseen state of affairs occur, the developer can look at the previous state changes to re(dis)cover the unforeseen event. Put simply, the inability to accurately predict the future is solved with 20/20 hindsight. Second, an unforeseen state of affairs is not itself a bug. The bug arise when the code of the app do not manage to interact with the state of affairs. With an immutable state, the developer therefore can often just add a new function/feature to address the unforeseen, while leaving the original state intact. The problems of emergent, edge case complexity therefore present themselves more as an opportunity for future features, than a show-stopping Bug. 

## WhatIs: session

A **session** is a sequence of individual, interconnected actions that 
1. span across both locations (e.g. both client and server),
2. span across time (e.g. two different times a user visits the same web app/domain), and
3. that are bound together by a common denominator, commonly imagined as the user-app-relationship.

To *implement* a 'session' of actions that spans time and locations, and bind them together with a common denominator, you need:
1. a medium for apps that can perform actions,
2. a connection/message transport protocol/communication layer for different apps to communicate with each other, and
3. persistent memory so that the apps can save state over time.

When making a web app, the foundation pieces that we have for this development is:
1. client- and server-side apps (a js function, an html element, a server-side app, etc. that can respond to an externally driven event),
2. the internet (HTTPS protocol), and
3. the browser's `history`, HTTP cookies, server-side database, javascript run-time memory, local-storage, serviceworker, etc.  

Here we mainly focus on the third aspect: how to persist state data in order to implement useful sessions in web apps?

## State in browser 1: The `history` of a browser's session

**The browsing session** is the sequence of actions that occur when a *browser* surfs the web. The **browser instance** (not the user) is the only common denominator of the actions in the session.

The browser session **state** is stored in the browser's `history`. This `history` is traditionally represented as **a linear sequence**, one page after the other. Each `history` entry is simply a **`url:timestamp`**. Functions in the browser such as click-on-link, back, forward, `history.push(..)`, write url in address bar are examples of functions that fill the browser `history` with state data.

The browser's `history` is the **archetypal** web session persistance layer and also the session state bearer of last resort. Even if the browser's have disabled all other forms of interaction (blocked cookies and disabled javascript) and the user continuously erases the browser's `history`, it is always present as at least one entry visible as the browser's current `location` in the address bar.

On first glance, the browser's `history` can look immutable. As the browser goes from one page to the next, new `url:timestamp`s are added to the list. Unfortunately, this is not the case. If a user first goes back a couple of pages and then clicks on a link, then the browsing session branches of in a new direction. At this point, the old entries in the linear `history` that the user just back-tracked are discarded and lost. Ecce! *Semi*-immutable state. Which is mutable. 

As the `history` is not considered immutable and safe, the browser have added other means to mutate the browsing session state too: `history.replaceState(...)` (which can mutate the current, history entry), and `history.pushState(...)` (which can be misused to fill the history with new entries). By combining a simple state (linear `history` of `url:timestamp`s) with a couple of functions (back-button and `history.push`), what could have been a nice immutable state is instead made mutatable.

When using the `history` and the path to the current location as a bearer of session state, one technical constraint is needed: the session data/string must be converted into a URI safe format. Several methods exists to accomplish this task, both [`encodeURIComponent(...)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) and [`toBase64url(...)`](../1_pure_tricks/HowTo_base64url.md).

The `history` is kept in the browser, but a glimpse of the history is added to HTTP requests sent to the server in the `referer` and `origin` header. However, this is obviously problematic, both for safety and privacy reasons, and so greatly limited. In order for the server functions to get access to more state data about an ongoing session with a browser, another means is needed: `HTTP cookies`.

## State in browser 2: HTTP cookies

As with the browsers' `history`, cookies are automatically stored in the browser, and not the server. However, here the similarities mostly end.

The three most important differences between cookies and the browser session `history` are:

1. cookies are associated with *both* browser instance(s) *and* server domain(s). As with `history`, each browser instance will store its own cookies. This means that another browser instance do not have access to that cookie. But, in addition to this constraint, cookies are also matched with a server domain. This means that cookies cannot be directly nor indirectly accessed and read by neither javascript functions nor html elements loaded from a different domain. Cookies are principly *only be accessible* to browser and server functions that are loaded from the same domain as the cookie. (Caveat 1) 

2. The `cookie` header of HTTP requests sends consistently more data than the `referer` or `origin` headers send `history` state data to the server.
 
3. In priniciple, the `history` state in the browser cannot be controlled from the server. HTTP cookies on the other hand *are* controllable by the server. In fact, many cookies are meant to primarily/exclusively be created, maintained by the server (cf. `httpOnly` and sessionId cookies). (Caveat 2, 3)

Caveats: 
1. "super cookies" would in older browsers span several domains; third-party cookies enable scripts to append cookies and thus survey a user's activity on another domain; cookies are not only restrained to domains, but can also be restrained to a path, ttl, protocol; etc. The association between browser instance and server domain is the primary and minimum session binding, but not necessarily the only one. 
2. neither HTML nor HTTP facilitate the server controlling the browser's `history` state. However, server functions can using simple javascript injection with calls to `history.pushState(...)` and `history.replaceState(...)` in practice control the browser's `history`. 
3. HTTP cookies can also be created and managed primarily or exclusively by javascript in the browser calling [`document.cookie`](https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie). 

Technically, a cookie is simply a key-value data pair with a set of [attributes](WhatIs_session.md), for example `shopping-cart=bread,butter; httpOnly; max-age=1234`. Browsers should store at least 50 cookies per domain, upto 4mb in total. 

Because of space constraint, state in cookies are treated as mutable. This can easily cause race conditions if both server-side scripts mutate the cookie using `set-cookie` headers and client-side javascripts mutate the same cookie using `document.cookie`. Therefore, the same cookie is most commonly mutated only client-side or only server-side, and rarely both.

The next chapter we will look in depth into `httpOnly` cookies, ie. cookies controlled by the server. In this chapter we will also discuss the different attributes used with cookies.
 
## browser-only and server-only state

Cookies are automatically sent from the browser to the server with most HTTP request. And the amount of data cookies can contain for a particular domain is severely constrained. But what if you want to store data only accessible to the javascripts running in the browser?
 
=> `localstorage` and `indexedDB`.

This presentation do not discuss these state storing alternatives.

## User sessions: `databases`, app data, and user data

The browsing session is primarily associated with the browser, not the user. However, most users' and web apps' alike find it much more relevant to *bind different actions together in a session based on a shared user*, and not shared browser instance. After all, a user might use different browser instances, and a browser instance might be used by more than one user.

So, instead, web apps started developing user bound sessions. Users log in and out, and the web apps both on the server and in the browser display and remember that user's previous actions and data. Such user sessions is the bread and butter of web apps. Most web applications need only store this state. Often, the user session is everywhere and everything in the web app.

But. And for some reason that eludes me, the browsers and HTTP protocol have shyed away from integrating the key operations needed to establish and control user sessions directly. There is really no builtin support in the browser for user authentication. There are only a few, low level mechanisms in the HTTP protocol for it. The little support there is for managing user state is low level, and spread across several different platforms. 

## Session state 1: *points* in a socio-semantic-time-space

Being everywhere and everything for so many web apps, one might imagine that user session state would be impossible to describe in a universal manner. But. I actually think that it is possible. And here are the 3 criteria that I think all state data associated with a state can be sorted under:

1. Unique **user identity**. Or `uid` in concise, technical jargon.
2. A **timestamp** and unique location. A chronotopical position, if we allow for a sligthly more pretentious, philosophical jargon.
3. Semantic **path**. In practice just a filename. In theory, a semantic location, a word which is given a new, additional interpretation by the data associated.

These three entries combined should always be enough to provide a `uuid`, a "universially unique identifier". In a user session.

In theory, *one individual* (a `uid`) can only make an utterance in *one point in time and space* in *one semantic dimension*. In practice, `uid+timestamp+path` should be enough to uniquely identify a single point in time.

## Session state 2: socio-semantic-time-space *graphs*

However, session state *span across* several actions; session state data is relational, it lies *between* or connects such socio-semantic-time-space points.

Philosophically, this means that state data in a user session needs to provide state data entries with *two* points, and then a vector of how the first is connected to the second. For example:
1. the first point refer to the state of a particular person's (uid) bank account number (path) at a particular point in time-space (unix time at planet earth).
2. then a particular amount of money is added to the bank account (a vector of change).
3. the second point refer to the state of that same person's (uid) same bank account number (path) at a another particular point in time-space (unix time at planet earth) after the transaction has been made.

Thus, all entries in the database of user session state contains *two* socio-semantic-time-space points and *one* vector that describes the path from one to the other.

## Session state 3: socio-semantic-time-space *web*

Although there can only be one vector between two particular points, each point can be bound to many different points. A very generous man can go to the bar and in one action buy one beer to all of the other patrons in that fine establishment.

These vectors are also bidirectional. Those same patrons might each in turn seek out the generous man and pay him back with kind words, a kiss on the cheek, or a cold beer.

The socio-semantic-time-space *graph* is a *web* of change vectors criss crossing and connecting to different points. In practice, however, to keep the complexity of such a socio-semantic-time-space *web* manageable and understandable, we limit:
1. the time in such *webs* to function like ours (no timetravel, and no cheating/hacking, you can only write in the here and now),
2. a user can never change (a real life person can create and kill user identities, but these user identities cannot easily morph from one to the other in the session state), and
3. different types of the vector can be separated as different types of entries (the record of a user logging in and out is stored under different data entry types such as `IN` or `OUT` in one table, while records of the user altering the content of a text or moving about in a game, is stored under other entry types such as `EDIT` and `MOVE` in a second table). 

In theory, we can call this socio-semantic-time-space *web* an intertext.    

## References

 * 