# HowTo: unitTest?

When you write unit tests, you try to fashion your unit as a pure function that given a set of input parameters produce an output. You want this function:

1. to have no side-effects (ie. not write any output that is not passed out as the functions output or thrown as error). Examples of side-effects are:
	* to invoke a system function that does something with the data given,
	* mutate an argument object,
	* change a global variable.
2. not to read any external global state *not* accessed directly from the input, such as reading a `window`/`self` property.

## Regulators, mount up!

Regulators is an excellent place to observe the input and output of an existing function, and then use these data to ***automatically*** produce a string of unit tests for that function.

```javascript
function unitTest(original, unitTestProvider = 'https://supertests.com/test/') {

  const name = original.name;
  const declaration = original.declaration;
  const lingeringTestCalls = [];

  async function logUnitTest(data) {
    return await fetch(unitTestProvider, {
      method: 'POST',
      contentType: 'json',
      body: JSON.stringify(data)
    });
  }

  const regulator = function (...args) {
    try {
      const output = original(...args);
      if (output instanceof Promise) {
        output.then(output => logUnitTest({args, output, name, declaration}));
        output.catch(error => logUnitTest({args, error, name, declaration}));
      } else {
        logUnitTest({args, output, name, declaration});
      }
      return output;
    } catch (error) {
      logUnitTest({args, error, name, declaration});
      throw error;
    }
  }
  Object.defineProperty(regulator, 'name', {value: '_ut_' + original.name});
  return regulator;
}
```

Note that we have included a property `.declaration` on the original input function. This is a key component for automatic unit tests. It should be a meaningful reference such as a URL that together with the `name` of the function can be used to uniquely identify which function has produced the output from the input. 

## hoard unit tests

It might be very beneficial to hoard the unitTests. We can delay the network request until we have all our tests and send them as a list, instead of sending them one by one immediately.

```javascript
function unitTest(original, unitTestProvider = 'https://supertests.com/test/') {

  const name = original.name;
  const declaration = original.declaration;
  const lingeringTestCalls = [];

  async function logUnitTestRaw(data) {
    return await fetch(unitTestProvider, {
      method: 'POST',
      contentType: 'json',
      body: JSON.stringify(data)
    });
  }
  const [finishedHoarding = testSentToServer, logUnitTest] = hoard(logUnitTestRaw, 10000); //you get 10sec!  

  const regulator = function (...args) {
    try {
      const output = original(...args);
      if (output instanceof Promise) {
        output.then(output => logUnitTest({args, output, name, declaration}));
        output.catch(error => logUnitTest({args, error, name, declaration}));
      } else {
        logUnitTest({args, output, name, declaration});
      }
      return output;
    } catch (error) {
      logUnitTest({args, error, name, declaration});
      throw error;
    }
  }
  Object.defineProperty(regulator, 'name', {value: '_ut_' + original.name});
  return [testSentToServer, regulator];
}
```

## References

* 