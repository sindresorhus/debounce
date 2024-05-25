type AnyFunction = (...arguments_: readonly any[]) => unknown;

/**
Creates a debounced function that delays execution until `wait` milliseconds have passed since its last invocation.

Set the `immediate` option to `true` to execute the function immediately at the start of the `wait` interval, preventing issues such as double-clicks on a button.

The returned function has the following methods:

- `.clear()` cancels any scheduled executions.
- `.flush()` if an execution is scheduled then it will be immediately executed and the timer will be cleared.
- `.trigger()` executes the function immediately and clears the timer if it was previously set.
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
		trigger(): void;
	};
}

export = debounce;
