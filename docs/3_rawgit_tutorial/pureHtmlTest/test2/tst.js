function functionToBeTested(count){
  const start = performance.now();
  let a = 0;
  for (let i = count; i < 1000000; i++)
    a += Math.sqrt(i);
  console.log(a);
  console.log((performance.now()-start).toFixed(2));
}
for (let i=0; i<=85; i++)
  functionToBeTested(i);


https://cloudflareworkers.com/?&_ga=2.68645777.103252605.1604305091-1010365947.1600154718#c441735ae42c67491b5b13434d688921:https://tutorial.cloudflareworkers.com/



  https://cloudflareworkers.com/?&_ga=2.68645777.103252605.1604305091-1010365947.1600154718#c441735ae42c67491b5b13434d688921:https://tutorial.cloudflareworkers.com/

async function handleRequest(request) {
  console.log('a', Date.now());
  Promise.resolve().then(()=>console.log('b', Date.now()));
  await new Promise(r=> setTimeout(()=>r(), 2));
  console.log('c', Date.now());
  await new Promise(r=> setTimeout(()=>r(), 0));
  console.log('d', Date.now());
  return new Response('hello sunshine');
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));




I tested 1million-sqrt-function in Chrome on my own computer, and it seems that v8 will optimize the test function after 3-4 runs. This means that the time it takes to run this function 1 time (the first time) might be 4-5ms slower than the 10th or the 85th time.

  I changed the demo so that v8 could not optimize it dramatically, while it mostly did the same thing, and the number of ops per 50ms dropped from 85 to 16. [demo 2](https://cloudflareworkers.com/#1412d575504222ea6c211614252dd46d:https://tutorial.cloudflareworkers.com/).

  ```javascript
function functionToBeTested(count){
  let a = 0;
  for (let i = count; i < 1000000; i++) 
    a += Math.sqrt(i);
  return a;
}

async function handleRequest(request) {
  for(let i = 0; i < 200; i++){
    const a = functionToBeTested(i);
    console.log(i, (50/i).toFixed(2) + 'ms', a);
  }
  return new Response('hello sunshine');
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

I conclude from this that:
  1. to test the duration of one function using this ops/50ms-trick, you need to factor in how and when v8 will optimize your functions,
  2. it might be a very good idea to keep the function objects that can benefit from optimization in the worker scope, and not the fetch event scope. That way, requests number 10-400 on a server might be 4-5ms faster than the first 1,2,3,4 requests.

  ps. The first time I instantiate a new worker with this test function, I get twice as many ops/50ms (32). I speculate wildly that this might be due to Cloudflare secretly being extra generous with us :santa:, ie. that Cloudflare grants each worker 100ms runtime for the first fetch request when the worker is also instantiated. Don't know. Wild speculation.