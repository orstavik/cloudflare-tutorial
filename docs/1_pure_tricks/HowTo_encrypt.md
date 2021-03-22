# HowTo: Encrypt a message using AES-GCM?

Encryption protects information from intruders: encrypted messages cannot be read (authenticity) nor altered (integrity) by outsiders who do not know the key. Unless they are hacked, of course. By encrypting messages, the server and browser can share **state** data that are supposed to be secret from all others.

## Why: AES-GCM?

There are many ciphers, but we use the most reliable and popular - **AES-GCM**. Why?

1. AES is symmetric, meaning that the same key is used both by the sender and reveiver of the encrypted message. We will use encryption to encrypt session data in a sessionID cookie that is passed from the server to the browser, and back again. However, the browser should never decrypt the message. The browser only passes the message back to the server. That means that it is the same server that will encrypt as decrypt data, and that means that we don't need to have a separate key for encrypting and decrypting the messages, and that means that a symmetric algorithm such as AES-GCM is good for our purposes. 

2. We want a native, 'web crypto' solution. Having an algorithm that can be triggered using a native library will be a) much more efficient, b) much faster, and c) much less complex.

3. Of the native algorithms supported in V8, there are only four that supports encryption: RSA-OAEP, AES-CTR, AES-CBC, and AES-GCM. We need a symmetric algorithm, and then there are only three alternatives: AES-CTR, AES-CBC, and AES-GCM.

4. The AES-GCM is the only one of these three algorithms that support checking both authenticity and integrity. Put simply, the GCM mode of AES include a checksum check within the algorithm itself that not only ensures that the encrypted message is a) made using the secret key (authenticity) and not just a random set of numbers, and b) not slightly altered afterwards (integrity). With AES-GCM, such a two purpose checksum check is included.

This means that AES-GCM is 1) the only native web crypto API algorithm for 2) synchronic encryption/decryption that 3) bake in checksum checking.   

## HowTo: encrypt a string (step 1) 

```javascript
async function encryptData(password, plaintext) {          
  const iv = crypto.getRandomValues(new Uint8Array(12)); 
  const cipher = await encryptAESGCM(password, iv, plaintext);
  return uint8ToHexString(iv) + '.' + toBase64url(btoa(cipher));
}
```

The `getEncryptedData(plaintext)` method takes in a string and then outputs another string containing the `<ivString>.<ciphertext>`. The [`iv`](HowTo_makeEncryptionIV.md) is an 'Initial Vector': a random sequence of numbers (Uint8). To turn this sequence of numbers into a hexstring (`/[a-f0-9]/`), use [`uint8ToHexString(iv)`](HowTo_makeEncryptionIV.md).

To convert the text output into a text string with no whitespace or strange looking characters, use [`toBase64url(btoa(cipher))`](HowTo_base64url.md).

The SECRET is the secret password/key. Made into a [HASH SHA256](HowTo_hash_sha256.md). The SECRET must be secret, ie.: 
 * stored on the server, never given to the browser.
 * stored as a global variable, **not** in the sourcecode (which might accidentally be committed to github).
 * as long as the SHA algorithm output. If someone were to randomly start guessing for your password, then the shorter the string you pass into the HASH SHA256 algorithm, then the fewer alternatives this hacker needs to try out before he/she guesses the right one. Thus, aim for at least 64chars/256 digits.
    * Think of the scenario this way: The hacker gets your encrypted message as a cookie. He has access to the datastructure from your open source code on github. And he can guess what it is supposed to be (ie. a JSON object, which at least looks like this: `{ ... }`). So, he has all the time in the world to try generate lots and lots of passwords until he can find a secret message that will turn your secret session cookie into something that looks like a JSON string. Your defence is the number of attempts he must do and the time that it takes in order find the answer (ie. something that looks like a JSON string). If that time is long enough and you switch your keys often enough, then you are good. 
 * It might be better to use a random password generator. That will be harder to read. But, if you use a text string, it might be easier to remember (if you loose the old password). If you can, set up your system so that old keys can just be replaced when lost, and use a random generator.
 * Do not reuse initialization vectors. Never use iv with the same key twice for different plaintext messages.  

## HowTo: encrypt a string (step 2) 

In addition to an `iv` and a `SECRET`, the `getEncryptedData(SECRET, plaintext)` needs the `encryptAESGCM(password, iv, plaintext)` function.  

```javascript
async function encryptAESGCM(password, iv, plaintext) {
  const key = await makeKeyAESGCM(password, iv);            //[1]
  const ptUint8 = new TextEncoder().encode(plaintext);      //[2]
  const ctBuffer = await crypto.subtle.encrypt({ name: key.algorithm.name, iv: iv }, key, ptUint8);//[3]
  const ctArray = Array.from(new Uint8Array(ctBuffer));     //[4]
  return ctArray.map(byte => String.fromCharCode(byte)).join('');   // ciphertext as string
}
```

The primary purpose of the `encryptAESGCM(password, iv, plaintext)` is to call the `crypto.subtle.encrypt(...)` function with the **correctly formated arguments**. This means that:
1. the input `plaintext` is converted into a `Uint8Array` (buffer).
2. the input `SECRET` is converted into a crypto key (this can be cached, see below).
3. the output `ciphertext` is converted into a string.
 
## HowTo: encrypt a string (step 3) 

The `crypto.subtle.encrypt(...)` requires a `CryptoKey` object that is generated from a password using the `crypto.subtle.importKey(...)` function. However, the app usually use the same key for multiple encryption/decryption tasks. Therefore, it is efficient to cache the keys created for the same password in the memory of the app performing this task.

```javascript
let cachedPassHash;

async function passHash(pw) {
  return cachedPassHash || (cachedPassHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw)));
}

async function makeKeyAESGCM(password, iv) {
  const pwHash = await passHash(password);    //small value generated by a hash function from a whole message
  const alg = { name: 'AES-GCM', iv: iv };    // specify algorithm to use
  return await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt', 'encrypt']);  //make crypto key
}
```

## Next, decrypt!

The demo for this sequence can be seen in the [HowTo_decrypt](HowTo_decrypt.md).


## Reference
* [Wikipedia: Galois/Counter Mode](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
* [MDN: importKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey)