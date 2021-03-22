# Pattern: ResponseRace?

## Why: ResponseRace?

A ResponseRace is an AsyncDecorator state machine used to produce an HTTP `Response` from an HTTP `Request` and a list of actions. Essentially, a ResponseRace is a pattern and implementation method for making a web server. The ResponseRace is the server side equivalent of adding something like Redux in the browser.

The main purpose of making the ResponseRace is to enable web servers to be written declaratively, and not imperatively. 
1. Having a declarative structure greatly simplify complex code. 
2. A declarative setup also greatly simplify reuse of both individual modules (it is simpler to know how to style modules solving different tasks, and it is simpler to use those modules once you have imported them) and reuse of module composition (it is simpler to copy and paste and modify code from one web server to a make new web server from scratch). 
3. Setting up declarative models enable better support for compile time error resolution. 
4. A declarative model also better supports graphic descriptions of the code, as well as graphic tools to create, maintain, debug, and document individual web servers and clusters of web servers.

The drawback of using a ResponseRace is that it adds a platform on top of a platform. If a web server's state and functions are very simple, then adding an platform inside a platform to run that web server adds complexity. In order to confidently read and write a web server as a ResponseRace, you need to understand at least some of how the ResponseRace works, its semantic/syntactic makeup, and the restrictions/limitations set upon its actions.  

## How: does the ResponseRace work? 

The ResponseRace is a modification of the AsyncDecorator pattern that adds the following rules and restrictions:

1. Each action has either zero or two outcome states:
   * observer: zero outcome states.
   * decorator: two outcome states.

2. The decorator's two outcome states are always either:
   1. success, ie. the normal output of the function.
   2. error, ie. the error if the function throws an error.
   * The success outcome state is always required; the error outcome state is always optional. Thus, if the success outcome state is resolved before the decorator function has started, then that decorator function will not be called.
   * If you do not declare an error state name in the action list, then an the error outcome state will be automatically named: '_error_${actionIndex}'.
   * State names must begin with a normal character: `stateName[0].match(/a-zA-Z]/)`. 

3. The observers have an implicit 'ended' outcome state. An action that either has succeeded or failed will be deemed as ended. 

3. There is no difference between success and error states.
   
3. State objects can be any data object such as a `string`, `Error`, an `Object`, `undefined`, `false`, `Response`, `Stream` etc.

4. The ResponseRace is started when it is given:
   1. a start state with a single property `request` which contains a `Request` object, and
   2. a list of actions specified as `[incoming states, action, normal outcome state, error state]`. For example:
```javascript
const actions = [
  [['request'], decorator1, 'success1', 'error'],
  [['success1'], observer],
  [['success1'], decorator2, 'response']  //implies _error_2 as error outcome state
];
```

5. The ResponseRace will immediately return a `response` object and an array of observers. 
   
6. The `response` object can be either:
   1. `undefined`. If the `response` (or a `Promise` that turns into a `response`) is `undefined`, then the `request` will be handled by the subsystem (or return an empty `404` if no subsystem exists). 
   2. Everything else will be turned into a `Response` object and returned as the HTTP response to the incoming HTTP request.

7. The array of observers are considered `Promise`s that will be keep the worker session alive until they are all resolved.

## Demo: SunshineRace web server

<iframe style="border: 1px solid rgba(0, 0, 0, 0.1);" width="800" height="450"
src="https://www.figma.com/embed?embed_host=share&url=https%3A%2F%2Fwww.figma.com%2Ffile%2FEqGMWvJQqd1yvhd3EwZmO1%2FResponseRace-2%3Fnode-id%3D0%253A1"
allowfullscreen></iframe>

Each action in the figure above convert one (or more states) into one of two new states: success or error. The black arrows signify the potential successful outcome of an action; the red arrow is the potential when the function `throw` an `Error`.

Each action waits until all its incoming states has been given a value (except when the incoming state is marked optional with the prefix `x`). It is unknown if an action will `Error`. It is unknown how much time each action will take. This means that it is unknown exactly which path and which functions will end up fulfilling the `response` in the application.

## Todo: Open issue

If the `response` or an observer waits for a `Promise` that has been cancelled, then it will wait in vain. An example of such a situation is this:

```
[
  [['request'], async function(){await new Promise(r=>setTimeout(r, 500)); throw new Error();}, 'success', 'error'],
  [['success'], function(){return 'never ever';}, 'response', 'error']
]
```

This is most likely to occur for an observer. There might be a situation where the machine will stay alive, even though all the promises that it awaits has been cancelled. 

The Cloudflare runtime knows when a `Promise` becomes unresolvable, I think. And it will end the worker even though 30sec or 50ms has not yet been reached. And so this will be fine either if the `Promise` is detected or in 30sec/50ms if the `Promise` is not detected. But. Is this still a problem?? and can it be fixed??

## References
