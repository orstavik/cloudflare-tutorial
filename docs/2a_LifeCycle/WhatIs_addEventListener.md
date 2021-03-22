# HowTo: `addEventListener('fetch', cb')`?

## `fetch` event is *sync*

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

## Multiple `addEventListener('fetch',..)`
                                         
You can add multiple event listener for `fetch` events. If the first event listener does not call `e.respondWith(aPromiseOrResponse)` *synchronously*, then the second event listener will run. However, if the first event listener *do* call `e.repondWith(..)`, then the second event listener is *not* called at all.

```javascript
addEventListener('fetch', e => {
  console.log('a');
  if(Math.random() < 0.5)
    e.respondWith(new Response('hello sunshine'));
});

addEventListener('fetch', e => {
  console.log('I will log ~half the times');
  e.respondWith(new Response('sometimes it rains'));
});
```

## References