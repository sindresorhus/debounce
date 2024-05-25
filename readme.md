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

To execute immediately only if you have scheduled invocations and reset the timer:

```js
window.onresize.flush();
```

To execute immediately and reset the timer if it was previously set:

```js
window.onresize.trigger();
```

## API

### debounce(fn, wait, options?)

Creates a debounced function that delays execution until `wait` milliseconds have passed since its last invocation.

Set the `immediate` option to `true` to execute the function immediately at the start of the `wait` interval, preventing issues such as double-clicks on a button.

The returned function has the following methods:

- `.clear()` cancels any scheduled executions.
- `.flush()` if an execution is scheduled then it will be immediately executed and the timer will be cleared.
- `.trigger()` executes the function immediately and clears the timer if it was previously set.

## Related

- [p-debounce](https://github.com/sindresorhus/p-debounce) - Similar but handles promises
- [throttleit](https://github.com/sindresorhus/throttleit) - Throttle a function to limit its execution rate
