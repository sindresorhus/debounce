import {test} from 'node:test';
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

test('flush() - does not run again in immediate mode when the call already ran', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100, {immediate: true});

	fn('a');
	fn.flush();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
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

test('immediate mode - a new burst after the window does not trip the context check', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	function MyClass() {}

	MyClass.prototype.debounced = debounce(callback, 100, {immediate: true});
	new MyClass().debounced('a');
	new MyClass().debounced('b');
	t.mock.timers.tick(100);

	// A context check throwing here fails the test on its own.
	new MyClass().debounced('c');

	t.assert.strictEqual(callback.mock.callCount(), 2);
	t.assert.deepStrictEqual(callback.mock.calls[1].arguments, ['c']);
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

test('clear() - cancels scheduled execution', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn();
	fn.clear();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 0);
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

test('flush() - executes immediately if pending', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn();
	t.mock.timers.tick(50);
	fn.flush();

	t.assert.strictEqual(callback.mock.callCount(), 1);
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

test('trigger() - executes immediately', t => {
	const callback = t.mock.fn();
	const fn = debounce(callback, 100);

	fn();
	fn.trigger();

	t.assert.strictEqual(callback.mock.callCount(), 1);
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

test('context validation - throws on different instances of same class', t => {
	function MyClass() {}
	MyClass.prototype.debounced = debounce(() => {});

	const instance1 = new MyClass();
	const instance2 = new MyClass();

	instance1.debounced();

	t.assert.throws(() => {
		instance2.debounced();
	}, {message: 'Debounced method called with different contexts of the same prototype.'});
});

test('context validation - allows different classes', t => {
	t.mock.timers.enable({apis: ['setTimeout', 'Date']});
	const callback = t.mock.fn();
	function MyClass1() {}
	function MyClass2() {}

	const debouncedFunction = debounce(callback, 100);
	MyClass1.prototype.debounced = debouncedFunction;
	MyClass2.prototype.debounced = debouncedFunction;

	const instance1 = new MyClass1();
	const instance2 = new MyClass2();

	instance1.debounced();
	instance2.debounced();
	t.mock.timers.tick(100);

	t.assert.strictEqual(callback.mock.callCount(), 1);
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

test('edge cases - wait above the maximum timer delay throws', t => {
	t.assert.throws(() => {
		debounce(() => {}, 3_000_000_000);
	}, RangeError);

	t.assert.throws(() => {
		debounce(() => {}, Infinity);
	}, RangeError);
});

test('edge cases - the maximum timer delay is allowed', t => {
	const fn = debounce(() => {}, (2 ** 31) - 1);

	// A rejected `wait` would throw here, which fails the test on its own.
	fn();
	t.assert.strictEqual(fn.isPending, true);

	fn.clear();
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
	debounce(callback, 100);

	t.mock.timers.runAll();

	t.assert.strictEqual(callback.mock.callCount(), 0);
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
