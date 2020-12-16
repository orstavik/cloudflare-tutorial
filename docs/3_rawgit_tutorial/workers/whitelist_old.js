//pure function import begins
function prepareRegexInAccessRights(dict) {
  return Object.entries(dict).map(([k, v]) => [k.match(/^\^.+\$$/) ? new RegExp(k) : k, v]);
}

function httpsOriginOrEmptyString(url) {
  if (!url)
    return '';
  url = new URL(url);
  if(url.protocol !== 'https:')
    return '';
  return url.host;
}

function whitelistRefererHttpsGetPost(req, accessRights) {

  if (req.method !== 'GET' && req.method !== 'POST')
    return ['', undefined];

  const refHost = httpsOriginOrEmptyString(req.headers.get('referer'));
  const accessHost = accessRights
    .filter(([h, r]) => h instanceof Regexp ? refHost.match(h) :  h === refHost)
    .map(([h, r]) => r)
    .join(' ');

  const accessMethod = req.method === 'GET' ?
    accessHost.replace(/[A-Z]/g, ''):
    accessHost;

  const normalAccess = Array.from(new Set(accessMethod.toLowerCase().split(' '))).join(' ');
  return [normalAccess, refHost];
}

//pure function import ends

//global variable
const ACCESS_RIGHTS = {
  '^([^.]+\\.){2}workers.dev$': 'read WRITE',
  '^(.*)$': 'cors READ',
  'a.b.workers.dev': 'cookie'
}

const accessRights = prepareRegexInAccessRights(ACCESS_RIGHTS);

const links = `<a href='whitelist.intertext-no.workers.dev'>get</a>
<form method='post' action='whitelist.intertext-no.workers.dev'><input type=submit value=post />`;

function handleRequest(req) {
  const [privies, refHost] = whitelistRefererHttpsGetPost(req, accessRights);

  //if cors is added as privilege, then add referer host to cors header.
  const headers = {'content-type': 'text/html'};
  if (privies.indexOf('cors') >= 0)
    headers['access-control-allow-origin'] = 'https://' + refHost;

  const result = `You requested: from ${refHost} with ${req.method} which gives you ${privies || 'no'} privileges. ${links}`;
  return new Response(result, {status: 200, headers});
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));