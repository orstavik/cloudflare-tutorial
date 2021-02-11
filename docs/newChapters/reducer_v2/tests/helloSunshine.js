export function getUrl(a) {
  return a.url;
}

export function helloSunshine(a) {
  return 'HelloSunshine: ' + a;
}

const actions = [
  [["request"], "getUrl", "url"],
  [["url"], "helloSunshine", "response"]
];