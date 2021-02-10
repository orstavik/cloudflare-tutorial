export function getUrl(a) {
  return a.url;
}

export function helloSunshine(a) {
  return 'HelloSunshine: ' + a;
}

const listOfActions = [
  [["request"], "getUrl", "url"],
  [["url"], "helloSunshine", "response"]
];