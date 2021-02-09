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

const listOfActions = [
  [['request'], () => '1', 'a', 'a'],
  [['request'], () => {
    throw new Error('should never happen')
  }, 'a', 'response'],
  [['&&a'], ()=>1, 'no', 'No'],
  [['&a', 42, '"hello sunshine"'], console.log],

  [['request'], a=>20, 'bo', 'boError'],
  [['!bo'], a=>a+1, '!co'],

  [['request'], tooLate, 'tooLate'],
  [['maybeError'], ()=>1],    //observer that will run earlier

  [['request'], ({url}) => "hello1 " + url, "!cache1"],
  [['request', 'a'], ({url}) => "hello2 " + url, "!cache2"],
  [['a'], ({url}) => "hello3 " + url, "!cache3"],

  [['request'], maybeError, 'hello', 'maybeError'],
  [['maybeError'], maybeErrorHandler, 'error'],
  [['request'], helloSunshine, 'response'],
  [['error'], errorToResult, 'response', 'response'],
  [['response', '*hello'], log],
];