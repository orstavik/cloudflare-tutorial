# HowTo: Decrypt a message using AES-GCM?

For the *symmetric* AEC-GCM algorithm, the process of decryption is more or less the exact reverse of the encryption process. Thus, to decrypt, we therefore need the following two methods:   

```javascript
async function decryptAESGCM(password, iv, ctStr) {
  const key = await makeKeyAESGCM(password, iv); 
  // ciphertext as Uint8Array
  const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(c => c.charCodeAt(0))); 
  const plainBuffer = await crypto.subtle.decrypt({ name: key.algorithm.name, iv: iv }, key, ctUint8);
  // return the buffer as a string object
  return new TextDecoder().decode(plainBuffer);   
}

async function decryptData(password, data) {
  const [ivText, cipherB64url] = data.split('.');  //split encrypted data to get iv and cipher
  const iv = hexStringToUint8(ivText);
  const cipher = atob(fromBase64url(cipherB64url));
  return await decryptAESGCM(password, iv, cipher);
}
```

And these two methods depend on the following pure functions not already in use by the encrypt function:

* [`hexStringToUint8(...)`](HowTo_makeEncryptionIV.md)
* [`fromBase64url(...)`](HowTo_base64url.md)

## Demo

```javascript
// PASSWORD HASH SHA-256
//   A cached hashing of the password which is reused multiple times.
//   turns short strings with length 5 and long strings with length 500 into hash strings always 256 long.
//   This function is needed by both the worker that encrypts and decrypts the message.
let cachedPassHash;

async function passHash(pw) {
  return cachedPassHash || (cachedPassHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw)));
}

// PASSWORD HASH SHA-256 ends

//base64url
//EXAMPLE:
//  const b64ulr = toBase64url(btoa(aStr));
//  const str = atob(fromBase64url(b64url));
//ATT!! notice how the  btoa and atob are respectively inside and then outside the base64url functions.
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

//base64url ends

//uint8ToHexString, and vice versa
function uint8ToHexString(ar){
  return Array.from(ar).map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

function hexStringToUint8(str){
  return new Uint8Array(str.match(/.{2}/g).map(byte => parseInt(byte, 16)));
}
//uint8ToHexString ends

//makeKey.
// create a key object based on a string-formatted 12byte iv, or from scratch.
async function makeKeyAESGCM(password, iv) {
  const pwHash = await passHash(password);
  const alg = {name: 'AES-GCM', iv: iv};                            // specify algorithm to use
  return await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt', 'encrypt']);  // use pw to generate key
}
//makeKey end

//ENCRYPT & DECRYPT
async function encryptAESGCM(password, iv, plaintext){
  const key = await makeKeyAESGCM(password, iv);
  const ptUint8 = new TextEncoder().encode(plaintext);                               // encode plaintext as UTF-8
  const ctBuffer = await crypto.subtle.encrypt({name: key.algorithm.name, iv: iv}, key, ptUint8);                   // encrypt plaintext using key
  const ctArray = Array.from(new Uint8Array(ctBuffer));                              // ciphertext as byte array
  return ctArray.map(byte => String.fromCharCode(byte)).join('');             // ciphertext as string
}

async function decryptAESGCM(password, iv, ctStr){
  const key = await makeKeyAESGCM(password, iv);
  const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(ch => ch.charCodeAt(0))); // ciphertext as Uint8Array
  const plainBuffer = await crypto.subtle.decrypt({name: key.algorithm.name, iv: iv}, key, ctUint8);                 // decrypt ciphertext using key
  return new TextDecoder().decode(plainBuffer);                                       // return the plaintext
}

async function encryptData(password, plaintext) {          
    const iv = crypto.getRandomValues(new Uint8Array(12)); 
    const cipher = await encryptAESGCM(password, iv, plaintext);
    return uint8ToHexString(iv) + '.' + toBase64url(btoa(cipher));
}

async function decryptData(password, data) {
  const [ivText, cipherB64url] = data.split('.');  //split encrypted data to get iv and cipher
  const iv = hexStringToUint8(ivText);
  const cipher = atob(fromBase64url(cipherB64url));
  return await decryptAESGCM(password, iv, cipher);
}
//ENCRYPT & DECRYPT end

const SECRET = 'klasjdfoqjpwoekfj!askdfj';

const plaintext = 'hello sunshine';
console.log(plaintext);
const encrypted = await encryptData(SECRET, plaintext);
console.log(encrypted);
const decrypted = await decryptData(SECRET, encrypted); 
console.log(decrypted);
```

## Reference

