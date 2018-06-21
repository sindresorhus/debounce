
# debounce

  Useful for implementing behavior that should only happen after a repeated
  action has completed.

## Installation

    $ component install component/debounce

  Or in node:

    $ npm install debounce

## Example

```js
var debounce = require('debounce');
window.onresize = debounce(resize, 200);

function resize(e) {
  console.log('height', window.innerHeight);
  console.log('width', window.innerWidth);
}
```

To later clear the timer and cancel currently scheduled executions:
```
window.onresize.clear();
```

To execute any pending invocations and reset the timer:
```
window.onresize.flush();
```

## API

### debounce(fn, wait, [ immediate || false ])

  Creates and returns a new debounced version of the passed function that
  will postpone its execution until after wait milliseconds have elapsed
  since the last time it was invoked.

  Pass `true` for the `immediate` parameter to cause debounce to trigger
  the function on the leading edge instead of the trailing edge of the wait
  interval. Useful in circumstances like preventing accidental double-clicks
  on a "submit" button from firing a second time.

  Pass a function for the `scheduler` parameter to called to delay functions.
  This defaults to `setTimeout` and should behave similarly.

  ```js
  var method = function () {
    console.log('Debounced!');
  };

  debounce(method, 100);
  debounce(method, 100, true);
```

  The debounced function returned has a property 'clear' that is a 
  function that will clear any scheduled future executions of your function.

  The debounced function returned has a property 'flush' that is a 
  function that will immediately execute the function if and only if execution is scheduled,
  and reset the execution timer for subsequent invocations of the debounced
  function.

### debounce(fn, wait, { getTimestamp?, immediate?, scheduler? })

  Same first two parameters `fn` and `wait` as before, but passing an object containing `getTimestamp` and/or `immediate` and/or `scheduler`.

  If the object contains `immediate`, it's used as before.

  If the object contains `getTimestamp`, it's used instead of `Date.now` to create current timestamps.
  It should be a function that returns a numeric timestamp.

  If the object contains `scheduler`, it's used instead of `setTimeout` to delay function executions.
  It should be a function that takes a function and a millisecond delay as a number.

  ```js
  var getTimestamp = function () {
    var now = Date.now();
    console.log('Found time', now);
    return now;
  };

  debounce(method, 100, {
    getTimestamp: getTimestamp,
  });

  var scheduler = function (callback, delay) {
    console.log('Calling', callback, 'in', delay, 'ms');
    setTimeout(callback, delay);
  }

  debounce(method, 100, true, {
    getTimestamp: getTimestamp,
    scheduler: scheduler,
    wait: true,
  });
  ```

## License

  MIT

  Original implementation is from [`underscore.js`](http://underscorejs.org/)
  which also has an MIT license.
