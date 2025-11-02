type AnyFunction = (...arguments_: readonly any[]) => unknown;

export type Options = {
	/**
	Execute the function immediately at the start of the wait interval, preventing issues such as double-clicks on a button.

	@default false

	@example
	```
	import debounce from 'debounce';

	const saveInput = debounce(() => {
		console.log('Saving...');
	}, 300, {immediate: true});

	// First call executes immediately
	// Subsequent calls within 300ms are ignored
	saveInput();
	saveInput(); // Ignored
	```
	*/
	readonly immediate?: boolean;
};

/**
A debounced function with additional methods for controlling its behavior.
*/
export type DebouncedFunction<F extends AnyFunction> = {
	/**
	Call the debounced function.

	@returns The result of the original function, or `undefined` if the debounced function was not executed.
	*/
	(...arguments_: Parameters<F>): ReturnType<F> | undefined;

	/**
	Indicates whether the debounce delay is currently active.

	@example
	```
	import debounce from 'debounce';

	const fn = debounce(() => console.log('Called'), 100);

	fn();
	console.log(fn.isPending); // true

	fn.clear();
	console.log(fn.isPending); // false
	```
	*/
	readonly isPending: boolean;

	/**
	Cancels any scheduled executions.

	@example
	```
	import debounce from 'debounce';

	const fn = debounce(() => console.log('Called'), 100);

	fn();
	fn.clear(); // Cancels the pending execution
	// 'Called' is never logged
	```
	*/
	clear(): void;

	/**
	If an execution is scheduled, it will be immediately executed and the timer will be cleared.

	@example
	```
	import debounce from 'debounce';

	const fn = debounce(() => console.log('Called'), 100);

	fn();
	fn.flush(); // Immediately executes
	// 'Called' is logged immediately
	```
	*/
	flush(): void;

	/**
	Executes the function immediately and clears the timer if it was previously set.

	@example
	```
	import debounce from 'debounce';

	const fn = debounce(() => console.log('Called'), 100);

	fn();
	fn.trigger(); // Immediately executes
	// 'Called' is logged immediately
	```
	*/
	trigger(): void;
};

/**
Creates a debounced function that delays execution until `wait` milliseconds have passed since its last invocation.

@param function_ - The function to debounce.
@param wait - The number of milliseconds to delay. Default: `100`.
@returns A debounced version of the function with additional control methods.

@example
```
import debounce from 'debounce';

function resize() {
	console.log('height', window.innerHeight);
	console.log('width', window.innerWidth);
}

window.onresize = debounce(resize, 200);
```
*/
export default function debounce<F extends AnyFunction>(
	function_: F,
	wait?: number,
	options?: Options
): DebouncedFunction<F>;
