function maybeError(request) {
  if (new URL(request.url).pathname === '/error')
    throw new SyntaxError('bobsibob');
  return 'world';
}

function maybeErrorHandler(maybeError) {
  const replace = new Error('this is a public hello world error message.');
  replace.status = 403;
  return replace;
}

function errorToResult(error) {
  return new Response(error.toString() + '\nLog: ' + undefined, {status: error.status || 404});
}

async function helloSunshine() {
  await new Promise(r => setTimeout(r, 500));
  return new Response('hello sunshine');
}

async function tooLate() {
  await new Promise(r => setTimeout(r, 1000));
  return "this function runs after the last observer";
}

async function log(response, hello) {
  const clone = response.clone();
  await new Promise(r => setTimeout(r, 500));
  console.log('logging later ' + clone.status + hello);
  // fetch('log', data);
}

function makeOne() {
  return '1';
}

const fail = () => {
  throw new Error('should never happen')
};

function makeOneNumber() {
  return 1;
}

function hello1({url}) {
  return "hello1 " + url;
}

function hello2({url}) {
  return "hello2 " + url;
}

function hello3({url}) {
  return "hello3 " + url;
}

function andAOne(a) {
  return a + 1;
}

function twenty(a) {
  return 20;
}

function consoleLog(...args) {
  return console.log(...args)
}

const listOfActions = [
  [["request"], "makeOne", "a", "a"],
  [["request"], "fail", "a", "response"],
  [["&&a"], "makeOneNumber", "no", "No"],
  [["&a", 42, "\"hello sunshine\""], "consoleLog"],

  [["request"], "twenty", "bo", "boError"],
  [["!bo"], "andAOne", "!co"],

  [["request"], "tooLate", "tooLate"],
  [["maybeError"], "makeOneNumber"],    //observer that will run earlier

  [["request"], hello1, "!cache1"],
  [["request", "a"], hello2, "!cache2"],
  [["a"], hello3, "!cache3"],

  [["request"], "maybeError", "hello", "maybeError"],
  [["maybeError"], "maybeErrorHandler", "error"],
  [["request"], "helloSunshine", "response"],
  [["error"], "errorToResult", "response", "response"],
  [["response", "*hello"], "log"],
];