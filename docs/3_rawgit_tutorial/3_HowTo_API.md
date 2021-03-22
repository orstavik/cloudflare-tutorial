# HowTo: API worker?

> API is short for "application programming interface". API is a general concept, essentially it is used to describe any dynamic or static resource that are intended to be consumed by another program, not a human user directly.

Here, we will use the term 'API worker' to mean a worker who will serve a computing/database resource to other scripts and html elements from multiple hosts. The API worker strives to be as declarative as possible in its makeup, so as to be as simple as possible to extend, debug and repurpose.

## Step 1: select action and arguments

An API worker provide several actions. Often, we use the first segment in the `pathname` in the request url to distinguish between actions.

```javascript
function handleRequest(req) {
  const url = new URL(req.url);
  const [action, secure] = url.pathname.split('/');
  //...
}
```

## Step 2: action arguments

Pass the arguments to your API worker using the following methods:

1. `GET` and `POST`: Any action that can be reached via `GET` (but also from `POST`), should send its arguments as `/`-segments in the url. The action is the first segment, and the different arguments the next. The alternative is to add arguments as a `?search=query&param`, but passing arguments as slash-segments is a) shorter argument list, b) a more readable, human-friendly url, and c) more in line with convention for `POST` requests. Remember to `encodeURIComponent(..)` in the browser and `decodeURIComponent(..)` when necessary.

2. `POST` only: Pass the argument in the `POST` request body as a json object. Such a structure will be easier to maintain and extend.

In addition to action arguments, two server-side arguments are added: privileges and sessionObject.

Att! Do not put secret/private information in slash-segments.

## Step 3: declare action

Each action should be declared as a pure function. Each pure action function gets:

1. request,
2. arguments,
3. privileges, and
4. sessionObject.

Each action returns an object of pure data.

The pure action functions can be stored in three dictionaries:

1. public functions which do not need to check privileges,
2. functions that need to check privileges, and
3. functions that require both privileges and sessionObject.

## step 4: putting humpty dumpty back together

Performance is important for an API, so if you don't need to compute privileges or decrypt a sessionID token for certain
actions, then you don't want skip those actions. Hence, the logic for passing arguments to pure action functions will
vary a little based on the action requested. Don't fight this. Roll with the `if-this-else-that` punches.

```javascript
const publicActions = {
  plus: function (a, b) {
    return a + b;
  },
  minus: function (a, b) {
    return a - b;
  }
};

const privilegedActions = {
  multiply: function (privies, a, b) {
    if (privies.indexOf('read') === -1)
      throw `multiply: insufficient privileges: ${privies || 'none'}`;
    return a * b;
  },
  divide: function (privies, a, b) {
    if (privies.indexOf('read') === -1)
      throw `divide: insufficient privileges: ${privies || 'none'}`;
    return a / b;
  }
};

const sessionObjectPrivilegedActions = {
  nameToNumber: function (sessionObj, privies, a, b) {
    if (privies.indexOf('write') === -1)
      throw `nameToNumber: insufficient privileges: ${privies || 'none'}`;
    return btoa(sessionObj.name);
  }
};

function handleRequest(req) {
  try {
    let res;
    const url = new URL(req.url);
    const [action, ...args] = url.pathname.split('/');
    if (publicActions[action])
      res = publicActions[action](...args);
    const referer = req.headers.get('referer');
    const privileges = whitelist(referer, req.url);
    if (privileges && privilegedActions[action])
      res = privilegedActions[action](privileges, ...args);
    const cookies = req.headers.get('cookie');
    const sessionID = getCookieValue(cookies, COOKIE_NAME);
    const sessionObj = decryptSessionId(SECRET, sessionID);
    if (sessionObj && privileges && sessionObjectPrivilegedActions[action])
      res = sessionObjectPrivilegedActions[action](sessionObj, privileges, ...args);
    throw `action unknown: ${action}, ${privileges}, ${!!sessionObj}`;
  } catch (err) {
    //log the error,
    //send a 500 response but don't reveal any secret information. 
  }
}
```

## References