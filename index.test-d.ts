import {expectTypeOf, expectError} from 'nz';
import debounce, {type DebouncedFunction, type Options} from './index.js';

// Type tests for the whole public surface. Anything asserted here with `expectError()` is a documented limit rather than an accident: if a future change makes one of them compile, the assertion fails and the docs need updating to match.

// A plain function keeps its parameters, its return type, and the `| undefined` for a call that did not run.
function resize(width: number, height: number): string {
	return `${width}x${height}`;
}

const debouncedResize = debounce(resize, 200);

expectTypeOf(debouncedResize).toBe<DebouncedFunction<typeof resize>>();
expectTypeOf(debouncedResize).parameters.toBe<[width: number, height: number]>();
expectTypeOf(debouncedResize(1, 2)).toBe<string | undefined>();
expectError(debouncedResize('1', 2), 'not assignable to parameter of type');
expectError(debouncedResize(1, '2'), 'not assignable to parameter of type');
expectError(debouncedResize(1), 'Expected 2 arguments, but got 1.');

expectTypeOf(debouncedResize.isPending).toBe<boolean>();
expectTypeOf(debouncedResize.clear).returns.toBe<void>();
expectTypeOf(debouncedResize.flush).returns.toBe<void>();
expectTypeOf(debouncedResize.trigger).returns.toBe<void>();
expectError(debouncedResize.isPending = true, 'read-only property');

// The options object is readonly, and `immediate` is the only option.
const options: Options = {immediate: true};
debounce(resize, 200, options);
expectError(options.immediate = false, 'read-only property');
expectError(debounce(resize, 200, {leading: true}), 'Object literal may only specify known properties');

// Both parameters are optional.
debounce(resize);
debounce(resize, 200);
debounce(resize, 200, {immediate: false});
debounce(resize, 200, null);
expectError(debounce('not a function', 200), 'not assignable to parameter of type');
expectError(debounce(resize, '200'), 'not assignable to parameter of type');

// A function with no return value is still typed as possibly returning `undefined`.
const debouncedNoReturn = debounce(() => {
	console.log('called');
}, 100);
expectTypeOf(debouncedNoReturn()).toBe<void | undefined>();

// A function with a `this` parameter is callable as a method. The `this` type is not kept, so a detached call is not an error, which is a limit.
class Widget {
	width = 100;

	onResize = debounce(function (this: Widget) {
		return this.width;
	}, 200);
}

const widget = new Widget();
expectTypeOf(widget.onResize()).toBe<number | undefined>();
const detachedOnResize = widget.onResize;
detachedOnResize();

// A mutable rest parameter survives, and its arguments are still checked.
const debouncedRest = debounce((...values: number[]) => values.length, 100);
expectTypeOf(debouncedRest(1, 2, 3)).toBe<number | undefined>();
expectTypeOf(debouncedRest()).toBe<number | undefined>();
expectError(debouncedRest(1, 'two'), 'not assignable to parameter of type');

// A readonly rest parameter also survives, and its arguments are still checked.
const debouncedReadonlyRest = debounce((...values: readonly number[]) => values.length, 100);
expectTypeOf(debouncedReadonlyRest(1, 2, 3)).toBe<number | undefined>();
expectError(debouncedReadonlyRest(1, 'two'), 'not assignable to parameter of type');

// An async function keeps its promise, and the call may still not have run.
const debouncedAsync = debounce(async (value: number) => value * 2, 100);
expectTypeOf(debouncedAsync(2)).toBe<Promise<number> | undefined>();

// An overloaded function keeps only its last signature, which the type documents as a limit. TypeScript resolves the parameter and return types to the final declaration.
/* eslint-disable @typescript-eslint/unified-signatures -- These three arities cannot be one signature, they are the point of the test. */
declare function overloaded(value: string): number;
declare function overloaded(value: number, radix: number): string;
declare function overloaded(value: number): string;
/* eslint-enable @typescript-eslint/unified-signatures */

const debouncedOverloaded = debounce(overloaded, 100);
expectTypeOf(debouncedOverloaded(1)).toBe<string | undefined>();
expectError(debouncedOverloaded('text'), 'not assignable to parameter of type');

// A generic function widens its type parameter to `unknown`, which the type documents as a limit.
function identity<Type>(value: Type): Type {
	return value;
}

const debouncedGeneric = debounce(identity, 100);
expectTypeOf(debouncedGeneric(1)).toBe<unknown>();
