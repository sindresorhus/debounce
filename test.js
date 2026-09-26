import fs from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {suite, test} from 'node:test';
import ts from 'typescript';
import debounce from './index.js';

test('basic', t => {
	t.assert.strictEqual(typeof debounce, 'function');
});

test('debounces correctly - delays execution until wait time', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn();
	fn();
	fn();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
});

test('debounces correctly - reschedules on rapid calls', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	setTimeout(fn, 100);
	setTimeout(fn, 150);
	setTimeout(fn, 200);
	setTimeout(fn, 250);

	t.mock.timers.tick(100);
	t.mock.timers.tick(50);
	t.mock.timers.tick(50);
	t.mock.timers.tick(50);
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
});

test('debounces correctly - preserves arguments', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn('test', 123);
	t.mock.timers.tick(100);

	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['test', 123]);
});

test('debounces correctly - preserves context', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const context = {a: 1};
	const fn = debounce(callback.bind(context), 100);

	fn();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.calls[0].this, context);
});

test('debounces correctly - handles recursive calls', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});

	const callback = t.mock.fn(n => {
		--n;
		if (n > 0) {
			fn(n);
		}
	});

	const fn = debounce(callback, 100);

	fn(3);
	t.mock.timers.tick(125);
	t.mock.timers.tick(250);
	t.mock.timers.tick(375);

	t.assert.strictEqual(callback.mock.callCount(), 3);
	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, [3]);
	t.assert.deepStrictEqual(callback.mock.calls[1].arguments, [2]);
	t.assert.deepStrictEqual(callback.mock.calls[2].arguments, [1]);
});

test('immediate mode - executes immediately on first call', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100, {immediate: true});

	fn();
	t.assert.strictEqual(callback.mock.callCount(), 1);

	t.mock.timers.tick(100);
	t.assert.strictEqual(callback.mock.callCount(), 1);
});

test('immediate mode - ignores calls during wait period', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100, {immediate: true});

	fn();
	fn();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
});

test('immediate mode - ignores calls from different instances during the wait period', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	class Widget {}

	Widget.prototype.save = debounce(callback, 100, {immediate: true});
	const first = new Widget();
	first.save('first');
	new Widget().save('second');
	new Widget().save('third');

	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['first']);
	t.assert.strictEqual(callback.mock.calls[0].this, first);

	t.mock.timers.tick(100);
	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.strictEqual(first.save.isPending, false);
});

test('immediate mode - trigger() after the window does not replay earlier arguments', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100, {immediate: true});

	fn('a');
	fn('b');
	t.mock.timers.tick(100);
	fn.trigger();

	t.assert.strictEqual(callback.mock.callCount(), 2);
	t.assert.deepStrictEqual(callback.mock.calls[1].arguments, []);

	// The receiver went with the burst that closed, so the replay has none, which is what makes calling `trigger()` on an `immediate` method that reads `this` throw inside the function.
	t.assert.strictEqual(callback.mock.calls[1].this, undefined);
});

test('immediate mode - a second burst runs on its own leading edge', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100, {immediate: true});

	fn('a');
	t.mock.timers.tick(100);
	fn('b');

	t.assert.strictEqual(callback.mock.callCount(), 2);
	t.assert.deepStrictEqual(callback.mock.calls[1].arguments, ['b']);

	t.mock.timers.tick(100);
	t.assert.strictEqual(callback.mock.callCount(), 2);
});

test('return values - returns undefined when not executing', t => {
	const callback = t.mock.fn(() => 'result');
	const fn = debounce(callback, 100);

	t.assert.strictEqual(fn(), undefined);
	t.assert.strictEqual(callback.mock.callCount(), 0);
});

test('return values - returns result in immediate mode', t => {
	const callback = t.mock.fn(() => 'result');
	const fn = debounce(callback, 100, {immediate: true});

	t.assert.strictEqual(fn(), 'result');
});

test('return values - returns undefined when already pending in immediate mode', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn(() => 'result');
	const fn = debounce(callback, 100, {immediate: true});

	t.assert.strictEqual(fn(), 'result');
	t.assert.strictEqual(fn(), undefined);

	t.mock.timers.runAll();
});

test('isPending', t => {
	const fn = debounce(() => {}, 100);

	t.assert.strictEqual(fn.isPending, false);
	fn();
	t.assert.strictEqual(fn.isPending, true);
	fn.trigger();
	t.assert.strictEqual(fn.isPending, false);
});

test('defaults - wait defaults to 100 ms', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback);

	fn();
	t.mock.timers.tick(99);
	t.assert.strictEqual(callback.mock.callCount(), 0);

	t.mock.timers.tick(1);
	t.assert.strictEqual(callback.mock.callCount(), 1);
});

test('defaults - an empty options object behaves like no options', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const withEmptyOptions = t.mock.fn();
	const withoutOptions = t.mock.fn();

	debounce(withEmptyOptions, 100, {})('a');
	debounce(withoutOptions, 100)('a');

	// An empty options object must not turn on `immediate`, so nothing may have run yet.
	t.assert.strictEqual(withEmptyOptions.mock.callCount(), 0);
	t.assert.strictEqual(withoutOptions.mock.callCount(), 0);

	t.mock.timers.tick(100);

	t.assert.strictEqual(withEmptyOptions.mock.callCount(), 1);
	t.assert.strictEqual(withoutOptions.mock.callCount(), 1);
});

test('isPending - tracks the trailing lifecycle', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const fn = debounce(() => {}, 100);

	t.assert.strictEqual(fn.isPending, false);
	fn();
	t.assert.strictEqual(fn.isPending, true);
	t.mock.timers.tick(100);
	t.assert.strictEqual(fn.isPending, false);
});

test('isPending - is true while an immediate call runs', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	let pendingDuringCall;
	const fn = debounce(() => {
		pendingDuringCall = fn.isPending;
	}, 100, {immediate: true});

	fn();
	t.assert.strictEqual(pendingDuringCall, true);
	t.assert.strictEqual(fn.isPending, true);

	t.mock.timers.tick(100);
	t.assert.strictEqual(fn.isPending, false);
});

test('isPending - is false while a trailing call runs', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	let pendingDuringCall;
	const fn = debounce(() => {
		pendingDuringCall = fn.isPending;
	}, 100);

	fn();
	t.mock.timers.tick(100);

	t.assert.strictEqual(pendingDuringCall, false);
	t.assert.strictEqual(fn.isPending, false);
});

test('clear() - cancels scheduled execution', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn();
	fn.clear();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 0);
});

test('clear() - a later call still runs', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn('first');
	fn.clear();
	fn('second');
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['second']);
});

test('clear() - is safe to call when nothing is pending', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn();
	t.mock.timers.tick(100);
	fn.clear();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.strictEqual(fn.isPending, false);
});

test('clear() - a burst keeps extending the wait', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	for (let index = 0; index < 5; index++) {
		fn(index);
		t.mock.timers.tick(50);
	}

	t.assert.strictEqual(callback.mock.callCount(), 0);

	t.mock.timers.tick(100);
	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, [4]);
});

test('clear() - clears stored arguments', t => {
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn('arg1', 'arg2');
	fn.clear();
	fn.trigger();

	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, []);
});

test('does not execute before timeout elapses', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	setTimeout(fn, 100);
	setTimeout(fn, 150);

	t.mock.timers.tick(175);

	t.assert.strictEqual(callback.mock.callCount(), 0);
});

test('flush() - prevents timeout execution after flush', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn();
	t.mock.timers.tick(50);
	fn.flush();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
});

test('flush() - preserves the context and arguments of the call it flushes', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);
	const context = {a: 1};

	fn.call(context, 'x');
	fn.flush();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['x']);
	t.assert.strictEqual(callback.mock.calls[0].this, context);
});

test('flush() - a second flush does nothing', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn('a');
	fn.flush();
	fn.flush();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.strictEqual(fn.isPending, false);
});

test('flush() - does nothing if not pending', t => {
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn.flush();

	t.assert.strictEqual(callback.mock.callCount(), 0);
});

test('flush() - allows subsequent calls after flush', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn();
	fn();
	fn.flush();

	t.assert.strictEqual(callback.mock.callCount(), 1);

	setTimeout(fn, 250);
	t.mock.timers.tick(75);
	t.mock.timers.tick(250);
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 2);
});

test('flush() - does not run again in immediate mode when the call already ran', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100, {immediate: true});

	fn('a');
	fn.flush();

	// Nothing was waiting to run, so the trailing window keeps going and the timer stays armed.
	t.assert.strictEqual(fn.isPending, true);
	t.assert.strictEqual(callback.mock.callCount(), 1);

	t.mock.timers.tick(100);
	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.strictEqual(fn.isPending, false);
});

test('flush() - delivers the last call of an immediate burst', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100, {immediate: true});

	fn('a');
	fn('b');
	fn.flush();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 2);
	t.assert.deepStrictEqual(callback.mock.calls[1].arguments, ['b']);
});

test('trigger() - clears timer', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn();
	fn.trigger();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
});

test('trigger() - with no call waiting it runs the function with no arguments and no receiver', t => {
	const calls = [];
	const fn = debounce(function (...arguments_) {
		calls.push({arguments: arguments_, receiver: this});
	}, 100);

	fn.trigger();

	// It runs rather than doing nothing, which `flush()` does, so a function that reads `this` has to be ready for there being none.
	t.assert.strictEqual(calls.length, 1);
	t.assert.deepStrictEqual(calls[0].arguments, []);
	t.assert.strictEqual(calls[0].receiver, undefined);
	t.assert.strictEqual(fn.isPending, false);
});

test('trigger() - allows subsequent calls', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn();
	fn.trigger();
	fn();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 2);
});

test('trigger() - preserves the context and arguments of the call it forces', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);
	const context = {a: 1};

	fn.call(context, 'x');
	fn.trigger();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['x']);
	t.assert.strictEqual(callback.mock.calls[0].this, context);
});

test('trigger() - can be called repeatedly', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn('a');
	fn.trigger();
	fn.trigger();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 2);
	t.assert.strictEqual(fn.isPending, false);
});

test('trigger() - keeps a call the function schedules from inside itself', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const calls = [];
	const fn = debounce(() => {
		calls.push('called');
		if (calls.length === 1) {
			fn();
		}
	}, 100);

	fn();
	fn.trigger();
	t.assert.strictEqual(fn.isPending, true);

	t.mock.timers.tick(100);
	t.assert.strictEqual(calls.length, 2);
});

test('flush() - keeps a call the function schedules from inside itself', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	let callCount = 0;
	const fn = debounce(() => {
		callCount++;
		if (callCount === 1) {
			fn();
		}
	}, 100);

	fn();
	t.mock.timers.tick(50);
	fn.flush();
	t.assert.strictEqual(fn.isPending, true);

	t.mock.timers.tick(100);
	t.assert.strictEqual(callCount, 2);
});

test('trigger() - does not run again when the function throws', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	let callCount = 0;
	const fn = debounce(() => {
		callCount++;
		throw new Error('boom');
	}, 100);

	fn();
	t.assert.throws(() => {
		fn.trigger();
	}, {message: 'boom'});

	t.assert.strictEqual(fn.isPending, false);

	t.mock.timers.tick(100);
	t.assert.strictEqual(callCount, 1);
});

test('flush() - does not run again when the function throws', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	let callCount = 0;
	const fn = debounce(() => {
		callCount++;
		throw new Error('boom');
	}, 100);

	fn();
	t.mock.timers.tick(50);
	t.assert.throws(() => {
		fn.flush();
	}, {message: 'boom'});

	t.assert.strictEqual(fn.isPending, false);

	t.mock.timers.tick(100);
	t.assert.strictEqual(callCount, 1);
});

test('a method shared through a prototype runs only the call from the last receiver', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	class Widget {}

	Widget.prototype.save = debounce(callback, 100);
	const first = new Widget();
	const second = new Widget();

	// There is no context check, so the earlier call is dropped without an error. This is the documented limit.
	first.save('first');
	second.save('second');
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['second']);
	t.assert.strictEqual(callback.mock.calls[0].this, second);
});

test('edge cases - a fractional wait still waits the full interval from the last call', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100.5);

	fn('a');
	t.mock.timers.tick(100);
	fn('b');

	// 90 ms after the last call, which is short of the 100.5 the debounce owes.
	t.mock.timers.tick(90);
	t.assert.strictEqual(callback.mock.callCount(), 0);

	// Step past it in small ticks, because the reschedule re-arms with a sub-millisecond remainder and a single large tick does not run a timer that was armed while that same tick was being processed.
	for (let step = 0; step < 10; step++) {
		t.mock.timers.tick(5);
	}

	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['b']);
	t.assert.strictEqual(fn.isPending, false);
});

test('edge cases - zero wait time', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 0);

	fn();
	t.mock.timers.tick(1);

	t.assert.strictEqual(callback.mock.callCount(), 1);
});

test('edge cases - long wait time', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 10_000);

	fn();
	t.mock.timers.tick(10_000);

	t.assert.strictEqual(callback.mock.callCount(), 1);
});

test('edge cases - negative wait throws', t => {
	t.assert.throws(() => {
		debounce(() => {}, -100);
	}, RangeError);
});

test('edge cases - NaN wait throws', t => {
	t.assert.throws(() => {
		debounce(() => {}, NaN);
	}, RangeError);
});

test('edge cases - a wait that does not compare as a number throws', t => {
	// 3.0.0 accepted these and silently treated them as a wait of zero, so a burst was not debounced.
	t.assert.throws(() => {
		debounce(() => {}, 'abc');
	}, RangeError);

	t.assert.throws(() => {
		debounce(() => {}, {});
	}, RangeError);
});

test('edge cases - a wait the timer cannot use', t => {
	// A symbol cannot be compared to a number at all, so the range check itself throws before the `RangeError` every other unusable `wait` gets.
	t.assert.throws(() => {
		debounce(() => {}, Symbol('wait'));
	}, TypeError);

	// A bigint does compare as a number, so it passes that check and `setTimeout` rejects it instead, which puts the failure on every call rather than on the construction.
	const fn = debounce(() => {}, 100n);

	t.assert.throws(() => {
		fn();
	}, TypeError);

	t.assert.strictEqual(fn.isPending, false);
});

test('edge cases - a wall clock that moves backwards runs the call instead of rescheduling', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn('a');

	// The clock jumps back an hour after the call, so the elapsed time is negative and unknowable. Rescheduling against a clock that is behind would wake up a second later, see the same negative elapsed time, and re-arm against it for as long as it takes the clock to catch up.
	const {now} = Date;
	Date.now = () => now() - 3_600_000;
	t.mock.timers.tick(100);
	Date.now = now;

	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['a']);
	t.assert.strictEqual(fn.isPending, false);
});

test('edge cases - wait above the maximum timer delay throws', t => {
	t.assert.throws(() => {
		debounce(() => {}, 3_000_000_000);
	}, RangeError);

	t.assert.throws(() => {
		debounce(() => {}, Infinity);
	}, RangeError);
});

test('edge cases - the maximum timer delay is allowed', t => {
	// Nothing is called here, so no long timer is ever armed and a regression in `clear()` cannot leave the test runner waiting. A rejected `wait` would throw above, which fails the test on its own.
	const fn = debounce(() => {}, (2 ** 31) - 1);

	t.assert.strictEqual(fn.isPending, false);
});

test('edge cases - boolean options throws', t => {
	t.assert.throws(() => {
		debounce(() => {}, 100, true);
	}, {
		name: 'TypeError',
		message: 'The `options` parameter must be an object, not a boolean. Use `{immediate: true}` instead.',
	});
});

test('edge cases - null options behaves like no options', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100, null);

	fn('a');
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
	t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['a']);
});

test('edge cases - non-function throws', t => {
	t.assert.throws(() => {
		debounce(123, 100);
	}, TypeError);
});

test('edge cases - call and apply methods', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);
	const context = {a: 1};

	fn.call(context);
	fn.apply(context);
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
});

test('edge cases - no calls made', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	// Constructing arms nothing, so there is no timer to run and nothing to fire.
	t.assert.strictEqual(fn.isPending, false);
	t.mock.timers.runAll();

	t.assert.strictEqual(callback.mock.callCount(), 0);
	t.assert.strictEqual(fn.isPending, false);
});

test('multiple instances', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback1 = t.mock.fn();
	const callback2 = t.mock.fn();
	const fn1 = debounce(callback1, 100);
	const fn2 = debounce(callback2, 200);

	fn1();
	fn2();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback1.mock.callCount(), 1);
	t.assert.strictEqual(callback2.mock.callCount(), 0);

	t.mock.timers.tick(100);
	t.assert.strictEqual(callback2.mock.callCount(), 1);
});

// Every other test that waits for a timer drives a mocked clock, so nothing checked that the fixed timing paths also hold under a real one. These use a short `wait` and assert only that a call has or has not run, never an exact time, and wait far longer than `wait` so a loaded machine cannot make them flaky.
suite('real timers', {concurrency: true}, () => {
	test('runs once after the wait', async t => {
		const callback = t.mock.fn();
		const fn = debounce(callback, 20);

		fn('a');
		fn('b');
		fn('c');
		t.assert.strictEqual(callback.mock.callCount(), 0);

		await delay(400);
		t.assert.strictEqual(callback.mock.callCount(), 1);
		t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['c']);
	});

	test('immediate mode runs on the leading edge only', async t => {
		const callback = t.mock.fn();
		const fn = debounce(callback, 20, {immediate: true});

		fn('a');
		fn('b');
		t.assert.strictEqual(callback.mock.callCount(), 1);
		t.assert.deepStrictEqual(callback.mock.calls[0].arguments, ['a']);

		await delay(400);
		t.assert.strictEqual(callback.mock.callCount(), 1);
	});

	test('flush() runs the pending call and stops the timer', async t => {
		const callback = t.mock.fn();
		const fn = debounce(callback, 20);

		fn('a');
		fn.flush();
		t.assert.strictEqual(callback.mock.callCount(), 1);

		await delay(400);
		t.assert.strictEqual(callback.mock.callCount(), 1);
	});

	test('trigger() runs the pending call and stops the timer', async t => {
		const callback = t.mock.fn();
		const fn = debounce(callback, 20);

		fn('a');
		fn.trigger();
		t.assert.strictEqual(callback.mock.callCount(), 1);

		await delay(400);
		t.assert.strictEqual(callback.mock.callCount(), 1);
	});

	test('a call the function makes from inside itself still runs', async t => {
		const calls = [];
		const fn = debounce(() => {
			calls.push('called');
			if (calls.length === 1) {
				fn();
			}
		}, 20);

		fn();
		fn.flush();
		t.assert.strictEqual(fn.isPending, true);
		t.assert.strictEqual(calls.length, 1);

		await delay(400);
		t.assert.strictEqual(calls.length, 2);
		t.assert.strictEqual(fn.isPending, false);
	});

	test('a throwing function is not run a second time', async t => {
		let callCount = 0;
		const fn = debounce(() => {
			callCount++;
			throw new Error('boom');
		}, 20);

		fn();
		t.assert.throws(() => {
			fn.flush();
		}, {message: 'boom'});

		t.assert.strictEqual(fn.isPending, false);

		await delay(400);
		t.assert.strictEqual(callCount, 1);
	});

	test('clear() cancels the pending call', async t => {
		const callback = t.mock.fn();
		const fn = debounce(callback, 20);

		fn();
		fn.clear();

		await delay(400);
		t.assert.strictEqual(callback.mock.callCount(), 0);
		t.assert.strictEqual(fn.isPending, false);
	});

	test('a zero wait still defers to a later tick', async t => {
		const callback = t.mock.fn();
		const fn = debounce(callback, 0);

		fn();
		t.assert.strictEqual(callback.mock.callCount(), 0);

		await delay(400);
		t.assert.strictEqual(callback.mock.callCount(), 1);
	});
});

// The manifest decides what a consumer actually gets, and nothing else in the suite touched it, so a renamed file or a stale path would only show up after publishing.
test('packaging - every path the manifest declares exists', t => {
	const manifest = JSON.parse(fs.readFileSync(new URL('package.json', import.meta.url), 'utf8'));
	const declared = [...manifest.files, ...Object.values(manifest.exports).map(target => target.default ?? target)];
	const missing = declared.filter(path => !fs.existsSync(new URL(path, import.meta.url)));

	t.assert.deepStrictEqual(missing, [], 'declared paths that do not exist');

	// `types` has to come first in the export map, or TypeScript never sees the declaration file.
	t.assert.deepStrictEqual(Object.keys(manifest.exports), ['types', 'default']);
});

test('packaging - the declared entry point imports and works', async t => {
	const manifest = JSON.parse(fs.readFileSync(new URL('package.json', import.meta.url), 'utf8'));
	const entry = manifest.exports.default;

	t.assert.ok(entry.startsWith('./'), `the default export must be a relative path, got ${entry}`);

	const module_ = await import(new URL(entry, import.meta.url).href);
	t.assert.strictEqual(typeof module_.default, 'function');

	const calls = [];
	const debounced = module_.default(value => {
		calls.push(value);
	}, 10);
	debounced('a');
	debounced.clear();
	t.assert.deepStrictEqual(calls, []);
	t.assert.strictEqual(debounced.isPending, false);
});

// The type declarations use bare fences throughout, the readme tags its blocks, and its one shell block is not code. An opening fence names the language and a closing one names nothing, which is what pairs them.
const documentationLanguages = new Set(['', 'js', 'ts']);

function codeBlocks(source) {
	const blocks = [];
	let language;
	let body = [];

	for (const line of source.split('\n')) {
		const fence = /^[\t ]*```(?<language>\w*)/v.exec(line);

		if (fence && language === undefined) {
			language = fence.groups.language;
			body = [];
		} else if (fence) {
			if (documentationLanguages.has(language)) {
				blocks.push(body.join('\n'));
			}

			language = undefined;
			body = [];
		} else if (language !== undefined) {
			body.push(line);
		}
	}

	return blocks;
}

// Every code block in the documentation is something a reader may copy, and nothing checked that they still parse. This catches a block that is no longer valid syntax. It does not type check one, so the readme's first example having stopped compiling for a TypeScript consumer is not what it would have found. The block count is checked only so that a fence parser that finds nothing cannot pass.
test('documentation - every code example still parses', t => {
	const problems = [];
	let blockCount = 0;

	for (const file of ['readme.md', 'index.d.ts']) {
		const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');

		for (const code of codeBlocks(source)) {
			blockCount++;
			const {diagnostics} = ts.transpileModule(code, {fileName: `example-${blockCount}.ts`, reportDiagnostics: true});

			for (const diagnostic of diagnostics) {
				problems.push(`${file} block ${blockCount}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
			}
		}
	}

	t.assert.ok(blockCount > 0, 'no code examples were found');
	t.assert.deepStrictEqual(problems, []);
});
