type AnyFunction = (...arguments_: readonly any[]) => unknown;

/**
Creates a debounced function that delays execution until `wait` milliseconds have passed since its last invocation.

Set the `immediate` option to `true` to invoke the function immediately at the start of the `wait` interval, preventing issues such as double-clicks on a button.

The returned function has a `.clear()` method to cancel scheduled executions, and a `.flush()` method for immediate execution and resetting the timer for future calls.
*/
declare function debounce<F extends AnyFunction>(
	function_: F,
	wait?: number,
	options?: {immediate: boolean}
): debounce.DebouncedFunction<F>;

declare namespace debounce {
	type DebouncedFunction<F extends AnyFunction> = {
		(...arguments_: Parameters<F>): ReturnType<F> | undefined;
		clear(): void;
		flush(): void;
	};
}

export = debounce;
