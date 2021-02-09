import {handleResponse, stateMachine} from "./ResponseRace.js";
import {compile} from "./compiler.js";

function debug(msg) {
  console.log(msg);
  window.parent.postMessage(msg, '*');
}

function frameToString({actions, variables: context, sequence}) {
  actions = actions.map(([id, params, fun, output, error]) => [params.map(p => p instanceof Object ? p.op + p.key : typeof (p) === 'string' ? JSON.stringify(p) : p), fun.name, output, error]);
  const variables = {};
  for (let key in context)
    variables[key] = context[key] === undefined ? null : context[key];
  return btoa(JSON.stringify({actions, sequence, variables}));
}

let previous = {};

function checkMutations({variables}) {
  const res = {}, diff = [];
  for (let key in variables) {
    res[key] = JSON.stringify(variables[key]);
    previous[key] !== res[key] && (diff.push([key, previous[key], res[key]]));
  }
  previous = res;
  return diff;
}

const cbs = [frame => debug(frameToString(frame))];
window.doCheckMutations && cbs.push(function (frame) {
  const diff = checkMutations(frame);
  if (diff.length > 1)
    debug("Mutation!! " + JSON.stringify(diff));
});

//todo the runtime, should it get its data from a system call? Instead of being set as text code?
//todo the runner should have a method that sent it a new event, instead of being created anew every time?
//todo, or should we instead just keep the state of the
const compiledActions = compile(listOfActions);
addEventListener('fetch', e => {
  const startState = Object.assign({request: e.request}, window.globals);
  const {response, observer} = stateMachine(compiledActions, startState, cbs);
  handleResponse(e, response, observer);
});

dispatchEvent(Object.assign(
  new Event('fetch'), {
    passThroughOnException: () => console.log('passThroughOnException.'),
    waitUntil: async data => console.log('waitUntil: ', await data),
    respondWith: async data => console.log('respondWith: ', await data),

  }, window.request));