//pure function import begins

function extractProp(rights, method) {
  return Object.entries(rights).filter(([k, v]) => k.indexOf(method) >= 0).map(([k, v]) => v).reduce((acc, cur) => {
    if (!acc)
      return cur;
    for (let key in cur)
      acc[key] = (acc[key] || []).concat(cur[key]);
    return acc;
  }, {});
}

function prepAccessRights(accessRightsSettings) {
  const rights = JSON.parse(accessRightsSettings);
  return {
    GET: extractProp(rights, 'GET'),
    POST: extractProp(rights, 'POST')
  };
}

function whitelistRefererGetPostHttps(req, accessRights) {
  let url = req.headers.get('referer');
  const refHost = url && (url = new URL(url)).protocol === 'https:' ? url.host : '';
  const rights = Object.entries(accessRights[req.method])
    .filter(([right, hosts]) => hosts.find(h => h[0] === '^' && h[h.length - 1] === '$' ? refHost.match(h) : h === refHost))
    .map(([right]) => right);
  return [rights, refHost];
}

//pure function import ends

//global variables, leaning toothpicks 4
const ACCESS_RIGHTS_SETTINGS = `{
  "POST": {
    "read": ["^(.*)$"],
    "write": ["^([^.]+\\\\.){2}workers.dev$"]
  },
  "GET_POST" : {
    "cookie": ["^([^.]+\\\\.){2}workers.dev$", "b.workers.dev"],
    "cors": ["^(.*)$"],
    "read": ["a.b.workers.dev", "whitelist.intertext-no.workers.dev"]
  }
}`;

const ACCESS_RIGHTS = prepAccessRights(ACCESS_RIGHTS_SETTINGS);

const links = `<a href='whitelist.intertext-no.workers.dev'>get</a>
<form method='post' action='whitelist.intertext-no.workers.dev'><input type=submit value=post /></form>`;

function handleRequest(req) {
  const [access, refHost] = whitelistRefererGetPostHttps(req, ACCESS_RIGHTS);

  //if cors is added as privilege, then add referer host to cors header.
  const headers = {'content-type': 'text/html'};
  if (access.indexOf('cors') >= 0 && refHost)
    headers['access-control-allow-origin'] = 'https://' + refHost;

  return new Response(`${req.method} request from ${refHost} has privileges: ${access || 'none'}. ${links}`, {headers});
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));