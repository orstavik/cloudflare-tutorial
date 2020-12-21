# HowTo: manage users? (the minimalist approach)
 
In this guide we illustrate how to establish a minimalist user database that do not store any sensitive data.

1. Use federated login. This enables you to avoid storing emails and passwords. From the federated login, you receive a `fedID`.
2. For every new user that logs in to your system, give them a shorter, unique `appID` using an atomic counter. This avoids having to present the `fedID` outside your system, which might leak privy information about your user's federated/real identity.
3. In the datastore, save one entry (`USERS_KV.put(fedId, newAppID)`):
```
fedIDa: appID1
fedIDb: appID2
fedIDc: appID3
```
4. Whenever a repeat user logs in, use `fedID` to retrieve the `appID` (`USERS_KV.get(fedId) =>  newAppID`). 
5. Store the `appID` as the userID in the session object. In the session object, also add identifying information such as `john.doe@gmail.com` or `github.com/johnDoe`. The reason for this personal information is only so that the user can identify himself which of his many virtual identities he is using to log in currently. The `appID` is the only thing the rest of your system needs to know about the owner of the session, while the `fedID` is only needed during authentication. 

## Benefits of a minimalist solution

User security. You, the maker of a small app do not need to maintain neither passwords nor email addresses in your app.

User privacy. You, the maker of a small app with a specific purpose do not need to know this or that information about your users. If you have good intentions in regards to user privacy and safety, act on these intentions and limit your own potential for overreach in the future.

Less data, less complexity, less cost of writing and storing data. Don't put your effort into a system emailing users to keep them active. Put your effort in your app to make it shine so that people remember you for who you are. 

The session object is only stored in the browsers. Using encryption, you get a stateless session management.

If you need your active users' personal information, you can change your policy when logging users in and add it to your database later. Sure. The user's who do not log in after you have had a change of heart, are no longer available, but users' should have this privacy.  


## Reference
* 