# HowTo: make an IV (initial vector)?

IV stands for "initial vector", and functions as a 'second secret' to the AES-GCM encryption algorithm.

1. The normal password is a **universal** secret: it is the same for all secret for all encrypted messages. The normal password is **SUPER SECRET**, it must never be shared.
2. The IV password is a **unique** secret: it should be different for all encrypted messages. The IV password primary purpose is to make it difficult for attackers to analyze a set of multiple encrypted messages in order to mine out the *normal password*. By using a random input for each message, the resulting cipher text becomes even more scrambled and even harder to use to find the original secret needed to make fake cipher texts or encrypt secret cipher messages. But! The IV password doesn't need to be secret, in fact it can be distributed with the encrypted messages. Sure, if you want extra security, you would try to keep the IV secret too, but even when the IV password is distributed with the encrypted message, the encryption and the normal, secret password remains safe.

The IV passwords should be different from each other: two messages should not be encrypted with the same IV. If an attacker has several messages with the same IV, it is simpler for him/her to analyze the group of encrypted messages that uses the same IV to mine out the normal, universal secret. How much simpler you ask, well that I don't know.

To keep IV different (enough), the IV is a random list of 12 Uint8 (one byte unsigned integers, ie. numbers from 0 to 255). To generate such a list is simple enough: `crypto.getRandomValues(new Uint8Array(12));`.

## Why use IV, and not just the message? as the random input

Why do we need the IV at all, why can't we just use for example the start of the message? Or some kind of hash of the message? Isn't that random input enough?

If we for example just used the first 12 chars of the input message, then we might think of them as different, but the might not be. First, only 26chars of the english alphabet might be represented, and that is not 256. Second, the messages might be wrapped the same way, such as all being JSON tokens: `{ alg: 'AES-GCM', ...`. So, using the first twelve chars in the message as the source of a random IV would not work.

But how about using a hash of the message, such as SHA256? The main problem with the hash is that it would make it difficult to decrypt the message. I think. That looking at the message, holding the universal secret in one hand, the AES-GCM algorithm wouldn't be able to figure out the random IV from the ciphertext.

Thus. A random IV must be made for each encryption, to ensure that the variable input of the AES-GCM algorithm is always varied enough, and then that IV vector must then be made available to the decryption process, so that it has all the passwords needed to decrypt the message. This hides the universal secret from being mined out from crypto analysis.

## HowTo: convert IV to and from string?

As we need to share the IV with the encrypted message, we need to convert this list of numbers into characters that are safe to pass over the internet: ie. base64url. To convert an array of 12 numbers into a base64url, and back again, we do like this:
```javascript
function uint8ToHexString(ar){
  return Array.from(ar).map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

function hexStringToUint8(str){
  return new Uint8Array(str.match(/.{2}/g).map(byte => parseInt(byte, 16)));
}
```

## References

 * dunno