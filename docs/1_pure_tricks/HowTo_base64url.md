# HowTo: base64url

## WhatIs: base64, `btoa(txt)` and `atob(b64txt)`?

`base64` is a text format that only allow the following 64 characters: `A-Za-z0-9+=/`. It is used for converting text that contain whitespace and strange characters into a format that is easy to transport and store. The pure function `btoa(txt)` converts **b**inary string into an **a**scii/base64 string, and `atob(b64str)` works in the other direction.

## What is: base64url?

But. There is one annoyance with base64: it uses the characters `+`, `/` and `=`. And these characters are not safe to use in a url. Thus, to make a piece of text safe to transport as part of a url, we must replace all the `+`, `/` and `=` with `-`, `_` and ``. We do this with two pure functions: `toBase64url(base64str)` and `fromBase64url(base64urlStr)`. 

```javascript
function toBase64url(base64str) {
  return base64str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64url(base64urlStr) {
  base64urlStr = base64urlStr.replace(/-/g, '+').replace(/_/g, '/');
  if (base64urlStr.length % 4 === 2)
    return base64urlStr + '==';
  if (base64urlStr.length % 4 === 3)
    return base64urlStr + '=';
  return base64urlStr;
}
```

There are two things to make note of:
1. The trailing `=` and `==` are used as padding to ensure that base64 strings are always 4, 8, 12, 16, 20 etc. characters long. When we convert base64 into base64url, we can therefore simply remove `=`, and when we convert base64url into base64, we therefore just add `=` at the end of the result until the string length `%4` is `0`. 
2.  when converting a 'normal' string into base64url (via base64), the base64 function is applied *BEFORE* the base64url when the string is encoded, and *AFTER* the base64url function when the string is decoded.

## Demo
 
```javascript
function toBase64url(base64str) {
  return base64str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64url(base64urlStr) {
  base64urlStr = base64urlStr.replace(/-/g, '+').replace(/_/g, '/');
  if (base64urlStr.length % 4 === 2)
    base64urlStr += '==';
  else if (base64urlStr.length % 4 === 3)
    base64urlStr += '=';
  return base64urlStr;
}

const str = 'hello sunshine!?#~<>*!';
console.log(str);                       
const b64 = btoa(str);
console.log(b64);
const b64url = toBase64url(b64); 
console.log(b64url);
const b642 = fromBase64url(b64url)      
console.log(b642);
const str2 = atob(fromBase64url(b642)); 
console.log(str2);
// hello sunshine!?#~<>*!
// aGVsbG8gc3Vuc2hpbmUhPyN+PD4qIQ==
// aGVsbG8gc3Vuc2hpbmUhPyN-PD4qIQ
// aGVsbG8gc3Vuc2hpbmUhPyN+PD4qIQ==
// hello sunshine!?#~<>*! 
```

## References:

* [MDN: atob()](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/atob)
* [MDN: btoa()](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa)