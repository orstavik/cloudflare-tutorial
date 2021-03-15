# Problem: regulate inner functions?

In this article we will discuss a second limitation with the combinators and regulators described thus far: inner function calls.

## Demo 1: the problem of `observe(goJungle)`?

Imagine you have an aggregate function that creates a list of items using a set of sub-routine functions that create each list item. It could for example be `getUserData(userId)` that builds a user data object using `getProfileInfo(userId)` and `getSessionInfo(userId)`, or it could be `getText()` that creates a text using `getHeader()`, `getArticle()`, and `getFooter()`. Here, we call the outermost function `goJungle()` and give it two sub routines `goBananas()` and `goGorillas()`. 

Now, in our application, all three functions should be `observed`. We need to know every time the application calls `goBananas()`, `goGorillas()`, and `goJungle()`. This might be in order to analyze the behavior of our users, or the behavior of our app, find bugs, reduce unnecessary calls to a db in the future, make a machine learn something, whatever. Thus, we therefore make a combinator that wraps our original functions in a regulator and then output the results.

```javascript
function observe(original){
    return function regulator(...args){
      console.log(original.name);
      return original(...args);
    };
}

function goBananas(){
  return "bananas";
}

function goGorillas(){
  return "gorillas";
}

function goJungle(){
  return [goBananas(), goGorillas()];
}

const observedBananas = observe(goBananas);
const observedGorillas = observe(goGorillas);
const observedJungle = observe(goJungle);

console.log(observedBananas());      //1
console.log(observedGorillas());     //2
console.log(observedJungle());       //3
```

1. When the first functions `observedBananas()` is called, first the wrapping regulator is called, which prints the name of the original function, and then the output of the function is logged: 
```
goBananas
bananas 
```
   
2. The same story repeats itself for `observedGorillas()`:  
```
goGorillas
gorillas     
```

3. But, what happens when we call `observedJungle()`? Will the `observedJungle()` trigger the observation of bananas and gorillas too? Or is it only the jungle that is being observed in this instance?

```
scenario A              | scenario B
------------------------------------------------
goJungle                | goJungle
goBananas               | ["bananas", "gorillas"]   
goGorillas              |  
["bananas", "gorillas"] |  
```

The answer is: **scenario B**. Why? 

When the `observe` function is wrapped around the `goJungle()` function, then there is nothing happening to the pointers to the original functions `goBananas()` and `goGorillas()` inside the original `goJungle()` function. First, the goJungle-regulator calls the goJungle-original, and then second, the goJungle-original calls the goBananas-original and goGorillas-original. Nothing has changed the references to the two other original function inside the goJungle-original when we wrapped the goJungle in an observe regulator.    

## References

* 