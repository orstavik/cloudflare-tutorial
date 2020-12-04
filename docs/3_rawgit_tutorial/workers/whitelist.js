const CORS_WHITELIST = ['a.friend.com', 'a.partner.com'];
const READ_WHITELIST = ['example.com'];
const WRITE_WHITELIST = ['example.com'];

const emptyResult = ['', null];

function whitelist(refUrl, reqUrl, method) {
  if (method !== 'GET' && method !== 'POST')
    return emptyResult;
  if (!refUrl)
    return emptyResult;
  refUrl = new URL(refUrl);
  reqUrl = new URL(reqUrl);
  if (refUrl.protocol !== reqUrl.protocol)
    return emptyResult;
  const refUrlHost = refUrl.host;
  if (refUrlHost === reqUrl.host)
    return ['same-origin', refUrlHost];
  if (method === 'POST' && WRITE_WHITELIST.indexOf(refUrlHost) >= 0)
    return ['write', refUrlHost];
  if (READ_WHITELIST.indexOf(refUrlHost) >= 0)
    return ['read', refUrlHost];
  if (CORS_WHITELIST.indexOf(refUrlHost) >= 0)
    return ['cors', refUrlHost];
  return emptyResult;
}

function handleRequest(req) {
  const referer = req.headers.get('referer');
  const [privies, refHost] = whitelist(referer, req.url, req.method);

  const headers = {'content-type': 'text/html'};
  if (privies)
    headers['access-control-allow-origin'] = refHost;

  const result = `You requested: from ${referer} with ${req.method} which gives you ${privies || 'no'} privileges.`;
  return new Response(result, {status: 200, headers});
}

addEventListener('fetch', e=>e.respondWith(handleRequest(e.request)));