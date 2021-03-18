# Pattern: PseudoThreads

Or "IIAFE" as you might also know them by.

Async functions in JS can run in parallel as if they were threads, except with the notable exception that they can read and write to the same objects on the heap without any restrictions. This is a bit dangerous. And very useful. And hard to understand. And so this little tutorial is about how we can *make* such threads in the least amount of effort and some short simple rules for you to follow when you use them.

## HowTo: IIAFE?

The technique for making pseudoThreads is an IIAFE, or async self-invoking function(ASIF) if you prefer.

```javascript
async function someFunction() {

  const myObject = {hello: "sunshine"};
  //some code

  //PseudoThread start
  const threadFinished = (async function () {     //1, 2
    try {                                         //3
      console.log(myObject.hello);                
      //some code                                 
    } catch (err) {                               //3
      console.error("PseudoThread failed:", err); //3
    }                                             //3
    return undefined;                             //2
  })();                                           //1
  //PseudoThread end
}
```

1. The PseudoThread is an `async` immediately-invoking function (iiafe). 
2. The iiafe returns a `Promise` here called `threadFinished`. This `Promise` should resolve when the thread ends, and so you are encouraged to `await` any async calls inside the PseudoThread before it returns. If you don't need the `threadFinished` `Promise` in your app, you can simply drop it. You do not have to pass any return value to the `threadFinished` `Promise` neither, but if you want, you can.
3. If an `Error` is thrown inside the PseudoThread, no other code will process it. Therefore, wrapping the PseudoThread code in a `try{..}catch(err){console.error("PseudoThread failed:", err);}` is a good idea.

## HowTo: access the same objects from different threads

The short answer to this is: carefully. The question is careful in what way?

1. When you read state from the surrounding context, this state might change. If what you read are `const`ants or values from `deepFreeze`d objects, then you do not have to worry.
2. When you write state to the surrounding context, try to write to separate properties and fields that are exclusively meant for the PseudoThread. Try to set up separate objects or separate branches of objects that "belong to" the PseudoThread.
3. Remember that when you create a PseudoThread, then the function from where you created the PseudoThread also becomes a PseudoThread. The main function and flow is also a PseudoThread, you just don't need to think about it as such when it is the only PseudoThread around.  

## References

*  