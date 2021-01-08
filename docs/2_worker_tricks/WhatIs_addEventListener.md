# WhatIs: `addEventListener`

`addEventListener('fetch', cb)` runs *sync* in the worker. This means that any microtask queued from one `fetch` event will be run after the next event listener has run.  

```javascript
addEventListener('fetch', e => {
  console.log('a');
  Promise.resolve().then(()=>console.log('a2'));
});

addEventListener('fetch', e => {
  console.log('b');
});
```
