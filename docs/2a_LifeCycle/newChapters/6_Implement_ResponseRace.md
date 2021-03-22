# HowTo: implement a ResponseRace engine?

This is a JS implementation of the ResponseRace state machine. This implementation relies on two parts: `firstWinsObject` and `wrapResultError` described in two separate chapters.

## Implementation

```javascript
import {cloneResponseProxy, firstComeWins} from './FirstComeWinsObject.js';
import {wrapSuccessError} from './WrapSuccessError.js';

const actions = [
  [['request'], helloSunshine, 'response', 'error'],               
  [['request'], maybeError, 'hello', 'maybeError'],                
  [['maybeError'], maybeErrorHandler, 'error', 'error'],           
  [['error'], errorToResult, 'response', 'response'],              
  [['response', '*hello'], log]                                    
];

function responseRaceStateMachine(request, actions) {
  const state = cloneResponseProxy(new Proxy({request}, firstComeWins));
  const observers = [];
  for (let [args, reducer, prop, propError] of actions) {
    const {success, error} = wrapSuccessError(state, reducer, args);
    prop && (state[prop] = success);
    propError && (state[propError] = error);
    prop || propError || observers.push(Promise.race([success, error]));
  }
  const response = state.hasOwnProperty('response') ? state.response : undefined; 
  return {response, observers};
}
```

## References
