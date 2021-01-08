# WhatIs: `addEventListener`

`addEventListener('fetch', cb)` runs *sync* in the worker. This means that any microtask queued from one `fetch` event will be run after the next event listener has run.

If two event listeners are added, and the first event listener do not call `e.respondWith(..)`, then the `fetch` event is passed to the next event listener.

```javascript
addEventListener('fetch', e => {
  console.log('a');
  Promise.resolve().then(()=>console.log('a2'));
});

addEventListener('fetch', e => {
  console.log('b');
  e.respondWith(new Response('hello sunshine'));
});
```

If two event listeners are added, and the first event listener *do* call `e.repondWith(..)`, then the second event listener is *not* called.

```javascript
addEventListener('fetch', e => {
  console.log('a');
  e.respondWith(new Response('hello sunshine'));
});

addEventListener('fetch', e => {
  console.log('never prints');
});
```