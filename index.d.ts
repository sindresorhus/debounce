type AnyFunction = (...arguments_: readonly any[]) => unknown;

/**
Inferring parameters with a readonly constraint preserves readonly rest parameters, which `Parameters<F>` otherwise resolves to `never`.
*/
type DebouncedParameters<F extends AnyFunction> = F extends (...arguments_: infer Arguments extends readonly unknown[]) => unknown ? Arguments : never;

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

All callers share one timer. If the debounced function is on a prototype, calls from different instances within one wait collapse into one and the others are silently dropped, so give each instance its own debounced function instead.

@remarks An overloaded function keeps only its last signature, and the type parameters of a generic function become `unknown`.
*/
export type DebouncedFunction<F extends AnyFunction> = {
	/**
	Call the debounced function.

	@returns The result of the original function, or `undefined` if the debounced function was not executed.
	*/
	(...arguments_: DebouncedParameters<F>): ReturnType<F> | undefined;

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
	If a call is waiting to run, it will be run immediately and the timer will be cleared. Does nothing when there is no call waiting to run, which includes an `immediate` call that already ran on the leading edge, and leaves any timer as it was. In `immediate` mode, the calls made during the wait do not run on their own, but `flush()` runs the last of them.

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
	Executes the function immediately and clears the timer if it was previously set. With no call waiting to run it still calls the function, with no arguments and no receiver.

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
@param wait - The number of milliseconds to delay, between `0` and `2147483647`, the largest delay a timer can wait for. Default: `100`.
@param options - Set `immediate` to `true` to run on the leading edge instead of waiting.
@returns A debounced version of the function with additional control methods.
@throws TypeError - If `function_` is not a function, or if `options` is a boolean.
@throws RangeError - If `wait` is negative, `NaN`, larger than the maximum timer delay, or a value that does not compare as a number such as a non-numeric string.

@example
```
import debounce from 'debounce';

function resize() {
	console.log('height', window.innerHeight);
	console.log('width', window.innerWidth);
}

const onResize = debounce(resize, 200);
window.addEventListener('resize', onResize);
```
*/
export default function debounce<F extends AnyFunction>(
	function_: F,
	wait?: number,
	options?: Options | null, // eslint-disable-line @typescript-eslint/no-restricted-types -- Explicitly accepted at runtime.
): DebouncedFunction<F>;

export {}; // eslint-disable-line unicorn/require-module-specifiers -- It stops the implicit export of the declarations without `export`.
