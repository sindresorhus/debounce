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

const onResize = debounce(resize, 200);
window.addEventListener('resize', onResize);
```

To check if the debounce delay is currently active:

```js
onResize.isPending;
```

To later clear the timer and cancel currently scheduled executions:

```js
onResize.clear();
```

Execute a pending call immediately (and clear the timer). Does nothing when there is no call waiting to run, which leaves any timer as it was:

```js
onResize.flush();
```

To execute immediately and clear the timer if it was previously set:

```js
onResize.trigger();
```

## API

### debounce(fn, wait?, options?)

Creates a debounced function that delays execution until `wait` milliseconds have passed since its last invocation.

The `wait` is in milliseconds and defaults to `100`.

Set the `immediate` option to `true` to execute the function immediately at the start of the `wait` interval, preventing issues such as double-clicks on a button.

The returned function has the following methods:

- `.isPending` indicates whether the debounce delay is currently active.
- `.clear()` cancels any scheduled executions.
- `.flush()` if a call is waiting to run then it is run immediately and the timer is cleared. Otherwise nothing happens and any timer is left as it was. In `immediate` mode, the calls made during the wait do not run on their own, but `.flush()` runs the last of them.
- `.trigger()` executes the function immediately and clears the timer if it was previously set. With no call waiting to run it still calls the function, with no arguments and no receiver.

### Errors

`debounce()` throws a `TypeError` if the first parameter is not a function, or if `options` is a boolean. It throws a `RangeError` if `wait` is negative, `NaN`, larger than the largest delay a timer can wait for, or a value that does not compare as a number such as a non-numeric string.

### Using it in a class

One debounced function shares one timer between all its callers. If you put it on a prototype, all instances share it, so calls from different instances within one wait collapse into one and the others are silently dropped. Give each instance its own debounced function instead:

```js
class Widget {
	onResize = debounce(() => {
		console.log('width', this.width);
	}, 200);
}
```

## Related

- [debounce-fn](https://github.com/sindresorhus/debounce-fn) - Similar but with more options like `maxWait` and `before`/`after`
- [p-debounce](https://github.com/sindresorhus/p-debounce) - Similar but handles promises
- [throttleit](https://github.com/sindresorhus/throttleit) - Throttle a function to limit its execution rate
