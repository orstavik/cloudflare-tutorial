# WhatIs: a "session"?

A **session** is a sequence of individual actions that 
1. span across both locations (e.g. both client and server),
2. span across time (e.g. two different times a user visits the same web app/domain), and
3. that are bound together by a common denominator, which most commonly is the same user (or more crudely the same browser on the same computer).

To *implement* a 'session' you might need to first connect a server web app with a client web app and then create/access some kind of data store where you can store your state values. This data store must be accessible both across the time span you require, and from all the different locations that is required.
 
When you add state information during a session, you have an architectural choice to make:
1. Immutable state? Ie. keep adding information about actions, so that the session data store continues to grow and grow until the session ends, or
2. Mutable state? Ie. change state information as variables, *in place*, so that the different entities that read and writes state information all work against and alter the same locations.

## Browsing session: `location` and `history`

The browsing session is the sequence of action of *a browser* surfing the web. It is a linear representation of one browser instance opening one page after the other.

The state of the browsing session is stored in the browser's `history`. The browser's history is the primary and archetypal web session. And the browser provides several windows into this data structure, first and foremost the address bar/`window.location` and then the browser's history/`window.history`. 

Because the address bar always shows the current `location`, the address bar's value will mutate as the browser jumps from page to page. However, the browser's `history` is principally semi-immutable. When a user goes from one location to the next, the new locations is added to the `history` list, which in principle could grow indefinitely. But. Alas. The `history` is linear. Thus, if a user goes back a couple of pages, and then branches of by clicking a new link, the old "forward path" of visited, then backtracked pages are lost. The browser overwrites entries in its linear `history`. Ecce! *Semi*-immutable state.

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