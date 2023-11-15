type AnyFunction = (...arguments_: readonly any[]) => unknown;

/**
Returns a function, that, as long as it continues to be invoked, will not be triggered. The function will be called after it stops being called for N milliseconds.

If `immediate` is passed, trigger the function on the leading edge, instead of the trailing. The function also has a property 'clear' that is a function which will clear the timer to prevent previously scheduled executions.
*/
declare function debounce<F extends AnyFunction>(
	function_: F,
	wait?: number,
	immediate?: boolean
): debounce.DebouncedFunction<F>;

declare namespace debounce {
	type DebouncedFunction<F extends AnyFunction> = {
		(...arguments_: Parameters<F>): ReturnType<F> | undefined;
		clear(): void;
		flush(): void;
	};
}

export = debounce;
