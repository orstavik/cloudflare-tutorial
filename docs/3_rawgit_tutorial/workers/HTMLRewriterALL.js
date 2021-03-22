//this demo produces red text on lightblue background.
const HTML = `<html>
<head>
  <title>Title</title>
  <link leave-me-alone>
  <link rel="stylesheet" href="test.css">
  <base target='_browser_ignore_base_without_href'>
  <base target='_browser_ignore_target_attribute' href="../test2/">
  <base target='_browser_ignores_second_base_href' href="../ooops/">
  <link rel="stylesheet" href="test2.css">
  <script app-inline src="test.js"></script>
  <script>console.log('not inlined');</script>
</head>
<body>
<h1>hello sunshine</h1>
</body>
</html>`;

const FILES = {
  '/test/test.css': `h1 { color: red; }`,
  '/test/test2.css': `h1 { background: pink; }`,
  '/test/test.js': `console.log('testRed1', window.serverData?.username);`,
  '/test2/test.css': `h1 { color: blue; }`,
  '/test2/test2.css': `h1 { background: lightblue; }`,
  '/test2/test.js': `console.log('testBlue2', window.serverData?.username);`,
  '/test/index.html': HTML
};

class ScriptInliner {
  constructor(data){
    this.data = data;
  }

  async element(el) {
    const prependHeadAppendBody = el.tagName === 'head' ? 'prepend' : 'append';
    const script = `<script>window.serverData = ${JSON.stringify(this.data)}</script>`
    el[prependHeadAppendBody](script, {html: true});
  }
}

class InlineMutator {

  constructor(cookie, base) {
    this.cookie = cookie;
    this.firstBase = base;
  }

  async element(el) {

    //update base
    if (el.tagName === 'base') {
      if (!this.secondBase)
        this.secondBase = new URL(el.getAttribute('href'), this.firstBase).href;
      return;
    }

    const src = el.getAttribute('src');
    el.removeAttribute('src');
    el.removeAttribute('app-inline');
    const path = new URL(src, this.secondBase || this.firstBase).pathname;
    const body = FILES[path];
    if (body)
      el.setInnerContent(body);
  }
}

class LinkToStyle {

  constructor(location) {
    this.firstBase = location.href;
    this.secondBase = undefined;
  }

  async element(el) {

    //update base
    if (el.tagName === 'base') {
      if (!this.secondBase)
        this.secondBase = new URL(el.getAttribute('href'), this.firstBase).href;
      return;
    }

    const href = el.getAttribute('href');
    const url = new URL(href, this.secondBase || this.firstBase);
    const body = FILES[url.pathname];
    if(body)
      el.replace(`<style>${body}</style>`, {html: true});
  }
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const body = FILES[path];
  const headers = {"content-type": 'text/' + path.substr(path.lastIndexOf('.') + 1)};
  if (!('text/' + path.substr(path.lastIndexOf('.') + 1) === 'text/html'))
    return new Response(body, {status: 200, headers});
  const linkToStyle = new LinkToStyle(url);
  const inlineMutator = new InlineMutator('Mr. Sunshine', url);
  const scriptInliner = new ScriptInliner({username: 'Mr. Sunshiny Day'});
  return new HTMLRewriter()
    .on('link[href][rel="stylesheet"]', linkToStyle)
    .on('base[href]', linkToStyle)
    .on('script[app-inline]', inlineMutator)
    .on('base[href]', inlineMutator)
    .on('head', scriptInliner)
    .transform(new Response(body, {status: 200, headers}));
}

addEventListener("fetch", e => e.respondWith(handleRequest(e.request)));