# Problem: regulate nested functions?

## WhatIs: nested function calls?

An aggregate function is a function that collects the result of a set of sub-routine functions to produce a combined object. Examples of an aggregate function could be a `getUserData(userId)` that builds a data object using `getProfileInfo(userId)` and `getSessionInfo(userId)`. Another example could be a `getText()` that creates a text using `getHeader()`, `getArticle()`, and `getFooter()`. Aggregate functions group together the result of several other functions.

## Demo 1: the problem of `observe(theJungle)`?

In this demo we contrive a `theJungle()` function to represent an aggregate function. A jungle is as we all know made up of bananas and (sometimes) gorillas. Thus, to make `theJungle`, all you have to do is call two sub functions `goBananas()` and (sometimes) `goGorillas()`.  

```javascript
function goBananas(){
  return "bananas";
}

function goGorillas(){
  return "gorillas";
}

function theJungle(sometimes){
  if(sometimes)
    return [goBananas(), goGorillas()];
  return [goBananas()];
}

console.log(theJungle(true)); // => ["bananas", "gorillas"]
console.log(theJungle(false)); // => ["bananas"]
```

Now, we want to observe the behavior of some key functions in our application. We need to monitor how many times `goBananas()` and `goGorillas()` is called so we don't run our of neither, and we need to monitor how often we create jungles with gorillas and without.

To monitor these function calls we wrap our three functions inside an `observe` regulator. This is a very simple regulator, it only prints to `console.log` each time the function is called, and like the primates we are, we can then sit and count bananas, gorillas and jungles with and without gorillas to our hearts content.

```javascript
function observe(original){
    return function regulator(...args){
      console.log(original.name, ...args);
      return original(...args);
    };
}

function goBananas(){
  return "bananas";
}

function goGorillas(){
  return "gorillas";
}

function theJungle(sometimes){
  if(sometimes)
    return [goBananas(), goGorillas()];
  return [goBananas()];
}

const observedBananas = observe(goBananas);
const observedGorillas = observe(goGorillas);
const observedJungle = observe(theJungle);

observedBananas();      //1
console.log("---")
observedGorillas();     //2
console.log("---")
observedJungle(true);   //3
```

1. When the first functions `observedBananas()` is called, then the wrapping regulator is called which prints the name of the original function: 
```
goBananas
```
   
2. The same story repeats itself for `observedGorillas()`:  
```
goGorillas
```

3. But, what happens when we call `observedJungle()`? Will only the jungle be observed during this function call instance? Or will the `observedJungle()` regulator also trigger `observedBananas()` and `observedGorillas()`? 

```
scenario A | scenario B             
------------------------------------
theJungle  | theJungle               
           | goBananas              
           | goGorillas             
```

The answer is: **scenario A** that *only* trigger `observedJungle()`. Why? 

When the `observe` function wraps around the `theJungle()` function, then there is nothing happening to the pointers to the function objects `goBananas()` and `goGorillas()` inside the original `theJungle()` function. Nothing changes *inside* the original function call instance, only outside it.    

## Discussion

If you want to regulate function invocations *inside* the original function being regulated, you want a **deep regulator**. This *is* the *same problem* that we described in the previous chapter: recursive regulators. The only difference is that the function instance being called inside the original function is a) the original function instance itself in recursion, and b) a different function instance in nested functions.
                                       
In the next chapters we will discuss the pros and cons of deep regulators, and how they can be implemented in JS.

## References

* 