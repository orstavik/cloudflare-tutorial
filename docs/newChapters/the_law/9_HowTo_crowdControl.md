# Pattern: CrowdControl

CrowdControl is a pattern for coordinated regulation of a set of functions. The pattern is super useful for especially state and execution flow management, ie. the observation, management, control and restrictions of a set of functions, either seen only in relation to each other, or in relation to a (state) object or fixed timeline. The correct application of the CrowdControl pattern can replace lots of build tools and other library resources, when wielded well.

The CrowdControl pattern is created with three steps:
1. create a regulator function that creates a list of regulated functions from a corresponding list of original functions;
2. the regulator closure establishes a shared state for the functions that can bind the execution of one original function with the execution of another; 
3. the CrowdControl regulator returns any additional output ahead of the regulated output functions it produces from the given original input functions.

## Example: Observe CallSequence

The demo below *observes* and *records* the order of invocation for a set of functions. This pattern is the origin of **regulator-based state management**. 

```javascript
function listInvocations(...funs){            //receive multiple input functions
  const invocations = [];                     //establish shared state
  return [invocations, ...funs.map(fun => {   //first return any regulator state 
    return function(...args){                 //second return the regulated functions
      invocations.push(fun.name);             //in the regulated functions, 
      return fun(...args);                    //use the regulator state
    }
  })];
}

function sumImpl(a,b){
  return a+b;
}

const [callSequence, sum, pow, sqrt] = listInvocations(sumImpl, Math.pow, Math.sqrt);

function hypotenuse(a,b){
  return sqrt(sum(pow(a,2), pow(b,2)));
}

console.log(hypotenuse(3,4)); // 5
console.log(callSequence);    // ["pow", "pow", "sumImpl", "sqrt"]
```

Simple solutions built with this pattern can replace both state management solutions such as Redux and development tools such as unit testing. It is truly powerful stuff.

## References

* 