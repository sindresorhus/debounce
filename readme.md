# debounce

> Delay function calls until a set time elapses after the last invocation

## Install

```sh
npm install debounce
```

## Usage

```js
import debounce from 'debounce';

function resize() {
	console.log('height', window.innerHeight);
	console.log('width', window.innerWidth);
}

window.onresize = debounce(resize, 200);
```

*(You can also use `const debounce = require('debounce')`)*

To later clear the timer and cancel currently scheduled executions:

```js
window.onresize.clear();
```

To execute any pending invocations and reset the timer:

```js
window.onresize.flush();
```

## API

### debounce(fn, wait, options?)

Creates a debounced function that delays execution until `wait` milliseconds have passed since its last invocation.

Set the `immediate` option to `true` to invoke the function immediately at the start of the `wait` interval, preventing issues such as double-clicks on a button.

The returned function has a `.clear()` method to cancel scheduled executions, and a `.flush()` method for immediate execution and resetting the timer for future calls.

## Related

- [p-debounce](https://github.com/sindresorhus/p-debounce) - Similar but handles promises.
