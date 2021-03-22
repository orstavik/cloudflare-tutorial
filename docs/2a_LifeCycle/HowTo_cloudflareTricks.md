# cloudflare tricks
        
## analyze the cf-request-id and cf-ray

The below demo finds the unique worker id. it is testable by querying it 15 times using curl.

```                                                            
063038e5650000fab410a2b000000001
AAAAAAAAAABBBBBBBBCCCCCDDDDDDDDD

AAAAAAAAAA:
Date.now() === new Date(parseInt(AAAAAAAAAA) + new Date('Wed, 01 Jan 2020 00:00:00 GMT').getTime())

BBBBBBBB:
workerId
can be tested using:
for i in {1..15}; do curl https://royal-snowflake.2js-no.workers.dev/; done

-0000d875-0-00001d0e-0-00007373-0-0000d87d-0-000010c5-0-00007357-0-00007367-0-0000d8a9-0-000010b1-0-00007377-0-0000735b-0-0000737b-0-00001d0e-1-0000d8a9-1-0000d8a9-2

You see the same id is present in the counters.

CCCCC:
the ray id I imagine.

DDDDDDDDD:
is always 1. Added to make the key 32 byte long?
```

```javascript
let count = 0;

async function handleRequest(req) {

  let cfi;
  const cfiFull = cfi = req.headers.get('cf-request-id');
  const header = cfi.substr(0, 10);
  const header10 = parseInt(header, 16);
  const now = Date.now();
  const jan1_2020 = new Date(now-header10).toUTCString();

  cfi = cfi.substr(10);
  const workerId = cfi.substr(0, 8);
  cfi = cfi.substr(8);
  const body2 = cfi.substr(0, 5);
  const always1 = cfi.substr(5);

  const [ray, colo] = req.headers.get('cf-ray').split('-');

  //return new Response([ray, colo, jan1_2020, workerId, count++, body2, always1, cfiFull].join('----------------'));
  return new Response([,colo, workerId, count++].join('-'));
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```                                               

## make a worker sleep a little

```javascript
//README: test using https://myworker.workers.dev/2000
async function handleRequest(req) {
  const url = new URL(req.url);
  const time = parseInt(url.pathname.substr(1)) || 0;
  const id = Math.random();
  console.log(time, id);
  await new Promise(r => setTimeout(r, time));
  return new Response('hello sunshine ' + time + ' - ' + id);
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```

[https://cloudflareworkers.com/?&_ga=2.225834073.2138029206.1602683608-1010365947.1600154718#ff6b9dda01cd146eaf2c0886edc14533:https://tutorial.cloudflareworkers.com/2000](https://cloudflareworkers.com/?&_ga=2.225834073.2138029206.1602683608-1010365947.1600154718#ff6b9dda01cd146eaf2c0886edc14533:https://tutorial.cloudflareworkers.com/2000)

## what and when can we delay what?

```javascript
let cache = 0;

async function countapi(name){
  return await (await fetch('https://api.countapi.xyz/hit/' + name)).text();
}

async function handleEvent(e) {

  //1. setTimeout works as long as it is called before a response object is resolved 
  //   in the e.respondWith(..)
  await new Promise(r => setTimeout(()=>{r();console.log('done sleeping')}, 1500));
  
  console.log('a', cache++);

  console.log(await countapi('api.countapi.xyz_works_just_fine'));
  
  Promise.resolve().then(async ()=> console.log(await countapi('PRT__works')));

  e.waitUntil(async ()=> console.log(await countapi('FetchEvent.waitUntil_doesnt_work')));
  
  setTimeout(()=> console.log('this happens after e.respondWith is called, and then nothing happens.'));

  setTimeout(async ()=> console.log(await countapi('setTimeout_doesnt_work')));

  Promise.resolve().then(async ()=> {
    console.log('prt works after e.respondWith(..), but not setTimeout within such a prt')
    await new Promise(r => setTimeout(()=>{
      r();
      console.log('snooze');
      }, 10));
  });

  return new Response('hello sunshine');
}

addEventListener('fetch', e => e.respondWith(handleEvent(e)));
//addEventListener('fetch', e => handleEvent(e)); //it doesn't help to avoid calling the e.respondWith() neither
```
                                                   
```javascript
function xNestedMicroTask(cb, nTimes){
  if(nTimes<=0)
    cb();
  else{
    console.log('.');
    Promise.resolve().then(()=>xNestedMicroTask(cb, --nTimes));
  }
}

async function handleEvent(e) {
  Promise.resolve().then(()=>console.log('two'));
  const dp2 = Promise.resolve().then(()=>{console.log('three'); return new Response('i made you wait for it666')});
  Promise.resolve().then(()=>console.log('four'));
  xNestedMicroTask(()=>console.log('nested devil'), 400);
  console.log('one');
  return dp2;
}

addEventListener('fetch', e => e.respondWith(handleEvent(e)));
```

singleton version:

```javascript
let cache = '';
let active = false;

function postProduction(e, cb, delay){
  if(active) 
    return;
  active = true;
  e.waitUntil(new Promise(function(r){
    setTimeout(async function(){
      await cb();
      active = false;
      r();
    }, delay);
  }));
}

async function handleEvent(e) {
  const res = new Response('wait for it ' + cache);
  const clone = res.clone();
  postProduction(e, async () => cache += await clone.text(), 4000);
  return res;
}

addEventListener('fetch', e => e.respondWith(handleEvent(e)));
```

## perform task when worker has been idle for 3sec

```javascript
let inMemoryCache = 0;
let lastRequestId;

function whenIdleFor3sec(e, cb, delay){
  const reqid = lastRequestId = e.request.headers.get('cf-request-id');
  e.waitUntil(new Promise(function(r){
    setTimeout(async function(){
      reqid === lastRequestId && await cb();
      r();
    }, delay);
  }));
}

async function handleEvent(e) {
  whenIdleFor3sec(e, async () => inMemoryCache += 33, 3000);
  return new Response('server updates number when worker is idle for 3 sec: ' + inMemoryCache);
}

addEventListener('fetch', e => e.respondWith(handleEvent(e)));
```