//pure function import begins

function prepAccessRights(rights, postRights) {
  const GET = JSON.parse(rights);
  const POST = JSON.parse(postRights);
  for (let key in GET)
    POST[key] = (POST[key] || []).concat(GET[key]);
  return {GET, POST};
}

function httpsOriginOrEmptyString(url) {
  if (!url)
    return '';
  url = new URL(url);
  if (url.protocol !== 'https:')
    return '';
  return url.host;
}

function hostMatches(host, h) {
  return h[0] === '^' && h[h.length - 1] === '$' ? host.match(h) : h === host;
}

function whitelistRefererHttpsGetPost(req, accessRights) {
  const refHost = httpsOriginOrEmptyString(req.headers.get('referer'));
  const access = Object.entries(accessRights[req.method])
    .filter(([r, hosts]) => hosts.find(h => hostMatches(refHost, h)))
    .map(([right]) => right)
    .join(' ');
  return [access, refHost];
}

//pure function import ends

//global variables, f.. we need four f..ing backslashes to produce one backslash
const ACCESS_RIGHTS = `{
  "cookie": ["^([^.]+\\\\.){2}workers.dev$", "b.workers.dev"],
  "cors": ["^(.*)$"],
  "read": ["a.b.workers.dev"]
}`;
const POST_ONLY_ACCESS_RIGHTS = `{
  "read": ["^(.*)$"],
  "write": ["^([^.]+\\\\.){2}workers.dev$"]
}`;
const methodPrivilegeHost = prepAccessRights(ACCESS_RIGHTS, POST_ONLY_ACCESS_RIGHTS);

//the global variables come in as json strings, and must be converted into a 

const links = `<a href='whitelist.intertext-no.workers.dev'>get</a>
<form method='post' action='whitelist.intertext-no.workers.dev'><input type=submit value=post />`;

function handleRequest(req) {
  const [access, refHost] = whitelistRefererHttpsGetPost(req, methodPrivilegeHost);

  //if cors is added as privilege, then add referer host to cors header.
  const headers = {'content-type': 'text/html'};
  if (access.indexOf('cors') >= 0)
    headers['access-control-allow-origin'] = 'https://' + refHost;

  return new Response(`${req.method} request from ${refHost} has privileges: ${access || 'none'}. ${links}`, {headers});
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));