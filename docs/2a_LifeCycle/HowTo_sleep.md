# HowTo: make a worker sleep?

There are two ways to delay a worker:
1. give it a timeout (max 30.000ms)
2. give it a lot to do (max 50ms)
                       
## The `Promise` of sleep

```javascript
new Promise(r=>setTimeout(r, 2000)); //sleep for 2000ms
```

Demo:

```javascript
async function handleRequest(request) {
   new Promise(r=>setTimeout(r, 15000)); //sleep/delay 15 seconds
   return new Response('good morning!');
}
addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
```


## Sleep on the job

```javascript
new Array(30000).fill(0).forEach(i=>i+1); //work that takes the worker roughly 1ms
```

Demo:

```javascript
const workDelayMs = 5;

async function handleRequest(request) {
   while(true){
      console.log('and a one ms');
      new Array(30000).fill(0).forEach(i=>i+1);
   }
   return new Response('hello world', {status: 200})
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));    //takes roughly 1ms
```


## References

* [countapi.xyz](https://countapi.xyz)