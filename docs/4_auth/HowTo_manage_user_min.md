# HowTo: manage users? (the minimalist approach)
 
How to keep track of users without storing any sensitive data?

1. Use federated login. The openID providers will manage emails and passwords for your app, your app only needs the `fedID`.
2. For every new user that logs in to your system, give them a shorter, unique `appID` using an atomic counter. This avoids having to present the `fedID` outside your system, which might leak privy information about your user's federated/real identity. The `appID` can also be much shorter, which helps with simpler urls.
3. In the datastore, save one entry (`USERS_KV.put(fedId, newAppID)`). This enables you to retrieve the same `appID` per `fedID`:
```
fedIDa: appID1
fedIDb: appID2
fedIDc: appID3
```
4. Whenever a repeat user logs in, use `fedID` to retrieve the `appID` (`USERS_KV.get(fedId) =>  newAppID`). 
5. Store the `appID` as the userID in the session object. The session object must also include identifying information such as `john.doe@gmail.com` or `github.com/johnDoe` so that an already logged in user can identify which of his/hers many virtual identities is currently logged in. In the rest of your application, you only really need to know which `appID` owns which sessions; the `fedID` (and the `USERS_KV`) is only needed by the auth worker. 

## Benefits of a minimalist solution

User security. No need for a small app to store emails nor passwords.

User privacy. No essential need for a small app with a specific purpose to know real-world or federated information about its users. Often, the functionality of the app has no need for user data.

Less data = less complexity. Managing private information about users will get in the way of other functionality. If encryption is used to only store the session object in the browser, then only the `fedID` to `appID` needs to be stored. This is as close to a stateless auth makeup that can be achieved when the `appID` needs to be shared externally.

Less data = cheaper writing and storing and reading data.

Minimalist can become maximalist. And maximalist can become minimalist. If your app in the future needs more personal information about its users, you can change your policy in the future. You will however not be able to retrieve more information about previous users that do not log in again.

## Reference
* 