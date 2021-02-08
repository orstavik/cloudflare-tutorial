import {rrListener} from "./ResponseRace.js";
import {compile} from "./compiler.js";

let previousState;
//todo the checkMutations is now old. We can now implement the check mutations using the beforeInvoke and afterFrame methods.
function checkMutations(msg) {
  const nowObj = JSON.parse(atob(msg));
  const i = nowObj.sequence.length;
  const variables = nowObj.variables;
  if (previousState) {
    for (let [key, oldVal] of Object.entries(previousState)) {
      const newVal = variables[key];
      const oldString = JSON.stringify(oldVal);
      const newString = JSON.stringify(newVal);
      if (oldString !== newString)
        window.parent.postMessage('!' + i + '!' + btoa(oldString) + '!' + btoa(newString), '*');
    }
  }
  previousState = nowObj.variables;
}

function debug(msg) {
  window.doMutationCheck && checkMutations(msg);
  console.log(msg);
  window.parent.postMessage(msg, '*');
}

const fetch = Object.assign(
  new Event('fetch'), {
    passThroughOnException: () => console.log('passThroughOnException.'),
    waitUntil: async data => console.log('waitUntil: ', await data),
    respondWith: async data => console.log('respondWith: ', await data),
    request: {url: window.url}
  });

const cache = {cache3: {'"1"': {success: 'sunshiny day'}}};

//todo the runner should have a method that sent it a new event, instead of being created anew every time?
//todo, or should we instead just keep the state of the
const compiledActions = compile(listOfActions);
addEventListener('fetch', e => rrListener(compiledActions, e, debug, cache));
dispatchEvent(fetch);