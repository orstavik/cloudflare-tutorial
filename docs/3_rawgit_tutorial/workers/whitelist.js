const WHITELIST_CORS = ['a.friend.com', 'a.partner.com'];
const WHITELIST_READ = ['example.com'];
const WHITELIST_WRITE = ['example.com'];

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
    return ['same-origin write read cors', refUrlHost];
  if (method === 'POST' && WHITELIST_WRITE.indexOf(refUrlHost) >= 0)
    return ['write read cors', refUrlHost];
  if (WHITELIST_READ.indexOf(refUrlHost) >= 0)
    return ['read cors', refUrlHost];
  if (WHITELIST_CORS.indexOf(refUrlHost) >= 0)
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