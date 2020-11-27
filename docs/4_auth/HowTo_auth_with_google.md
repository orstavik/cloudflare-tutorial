# HowTo: auth with google

## HowTo: setup your google app?

1. [https://console.cloud.google.com/](https://console.cloud.google.com/home/dashboard?project=two-js-no)

1. look at the worker.
2. request a login redirect to google using `/login`.
3. the `login` worker returns a redirect to google with the `nonce`, `state`, `client_id`, and `redirect_url`.
4. google and the users do their thing, and google gives the user a redirect to the `/fromGoogle` link. This callback returns the `state` and the `code` as searchParams.
5. our worker then goes and fetches the token from google using `code` and `client_secret`. This happens across a secure SSL connection between cf and google, so we trust the response here without question.
6. we then unwrap the jwt token received from google. This will be used to set create the session id.

## Demo

```javascript
const GOOGLE_CLIENTID = '595564072050-5t4i14ge3g0b7knrhn8an9pujha53m6q.apps.googleusercontent.com';
const GOOGLE_CLIENTSECRET = '-GAqDZ67_FXh4189fYV-dSxi';
const GOOGLE_REDIRECT = 'https://goauth2.2js-no.workers.dev/fromGoogle';

//todo here we should encrypt a timestamp, and then we can verify that this timestamp is still valid.
function randomString(length){
  const iv = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

function makeGoogleRedirect(state, client_id, redirect_url){
  const data = Object.assign({
    state, 
    client_id, 
    redirect_url, 
    nonce: randomString(12)
  }, {
    scope:'openid%20email',
    'response_type': 'code',
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?'+
    Object.entries(data).map(([k, v])=>k +'='+encodeURIComponent(v)).join('&');
}

async function fetchTokenGoogle(code, client_id, redirect_uri, client_secret) {
  const data = {code, client_id, client_secret, redirect_uri, 'grant_type':'authorization_code'};
  const dataString = Object.entries(data).map(([k, v])=>k +'='+encodeURIComponent(v)).join('&');

  const fromGoogle = await fetch('https://oauth2.googleapis.com/token',{
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: dataString
  });
  return fromGoogle.json();
}

const states = [];

async function handleRequest(req){
  const url = new URL(req.url);
  const [ignore, action, data] = url.pathname.split('/');
  if(action==='mainpage'){
    return new Response('mainpage, logutlink, loginlink');
  }
  if(action==='login'){
    const state = randomString(12);
    states.push(state);
    const redirectUrl = makeGoogleRedirect(state, GOOGLE_CLIENTID, GOOGLE_REDIRECT);
    return Response.redirect(redirectUrl);
  }
  if(action==='fromGoogle'){
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if(states.indexOf(state)===-1)
      return new Response('state is lost');
    const jwtString = await fetchTokenGoogle(code, GOOGLE_CLIENTID, GOOGLE_REDIRECT, GOOGLE_CLIENTSECRET);
    return new Response(JSON.stringify(jwtString), {status: 201});
  }
  return new Response('hello sunshine google oauth66');
}

addEventListener('fetch', e=> e.respondWith(handleRequest(e.request)));
```

## How to get the public key to verify google's RSA sign?

When a cf worker (serverside app) gets a jwt directly from a google server over HTTPS, then we don't need to verify the signature. We can trust that the public key is from google. But. If we wanted to verify the signature, we would need to get the google public key. This is how we do that. 

```javascript
let googleKeys = {};
const keyType = {
  name: 'RSASSA-PKCS1-v1_5',
  hash: 'sha-256'
};
(async function () {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  const rawKeys = await response.json();
  for (let googKey of rawKeys.keys)
    googleKeys[googKey.kid] = await crypto.subtle.importKey('jwk', googKey, keyType, false, ['verify']);
  console.log(googleKeys);
})();
```

## Ref

 * [the google doc page that i found most informative (see 'serverflow')](https://developers.google.com/identity/protocols/oauth2/openid-connect)
 * [page nr 2 for google describing oauth2](https://developers.google.com/identity/protocols/oauth2/web-server)
 * [https://www.googleapis.com/oauth2/v3/certs](https://www.googleapis.com/oauth2/v3/certs) 

## lifecycle #1
```
b=>s1
1.browser opens
 auth.example.com/login/google

s1=>b
2. 302 example.com=> google
 auth.example.com receives the requests, generate a login link at google service, and sends a 302 redirect back to the user

b=>s2
3. browser receives the redirect and automatically try to load the page from google

s2=>b
4. google openid gets the request, and the returns a 200 response to the browser with an interface where the user can type his password.

b=>s2
5. browser sends user+pass req to google

s2=>b
6. 302 google => example.com
google verify the user+pass and then sends a 302 redirect to auth.example.com/callback/google?code

b=>s1
7. browser receives the 302 and automatically requests to open auth.example.com/callback/google?code 

s1=>s2=>s1
8. server-server auth.example.com => google.com with the code
the auth.example.com then processes the callback from google. It does so by contacting google directly via a fetch to get the user data. using the code and the secret clientID.

s1=>b
9. 200 example.com => user with the user data
the auth.example.com can now send the user data back to the user as a response to the request 7 from browser. 
```
## lifecycle #2
```                               
b=>s1
1.browser opens
 auth.example.com/login/google

s1=>b
2. 302 example.com=> google
 auth.example.com receives the requests, generate a login link at google service, and sends a 302 redirect back to the user

b=>s2
3. browser receives the redirect and automatically try to load the page from google

s2=>b
4. google openid gets the request. 
with this request comes a lot of cookies, and one of these cookies tells google that the user has already logged in to this service, and does not have to do it again. (this is not only a cookie, google has server data also/instead, but the effect is the same). 302 google => example.com

the google auth openid server can therefore skip step 5. and 6., so that step 4 now essentially works as step 6. s2 now returns a 302 redirect to auth.example.com/callback/google?code.

b=>s1
7. browser receives the 302 and automatically requests to open auth.example.com/callback/google?code 

s1=>s2=>s1
8. server-server auth.example.com => google.com with the code
the auth.example.com then processes the callback from google. It does so by contacting google directly via a fetch to get the user data. using the code and the secret clientID.

s1=>b
9. 200 example.com => user with the user data
the auth.example.com can now send the user data back to the user as a response to the request 7 from browser. 
```

when things doesn't work, the user should be given a message, but not too specific in case of hackers. Google will tell the user if the password is wrong. the only ok thing that can happen, is that a user timeout on state param. or the server switches keys.