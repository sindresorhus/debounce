import {test} from 'node:test';
import assert from 'node:assert/strict';
import debounce from './index.js';

test('basic', async () => {
	assert.equal(typeof debounce, 'function');
});

test('debounces correctly', async t => {
	await t.test('delays execution until wait time', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn();
		fn();
		fn();
		t.mock.timers.tick(100);

		assert.equal(callback.mock.calls.length, 1);
	});

	await t.test('reschedules on rapid calls', async t => {
		t.mock.timers.enable();
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

		assert.equal(callback.mock.calls.length, 1);
	});

	await t.test('preserves arguments', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn('test', 123);
		t.mock.timers.tick(100);

		assert.deepEqual(callback.mock.calls[0].arguments, ['test', 123]);
	});

	await t.test('preserves context', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const context = {a: 1};
		const fn = debounce(callback.bind(context), 100);

		fn();
		t.mock.timers.tick(100);

		assert.equal(callback.mock.calls[0].this, context);
	});

	await t.test('handles recursive calls', async t => {
		t.mock.timers.enable();

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

		assert.equal(callback.mock.calls.length, 3);
		assert.deepEqual(callback.mock.calls[0].arguments, [3]);
		assert.deepEqual(callback.mock.calls[1].arguments, [2]);
		assert.deepEqual(callback.mock.calls[2].arguments, [1]);
	});
});

test('immediate mode', async t => {
	await t.test('executes immediately on first call', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100, {immediate: true});

		fn();
		assert.equal(callback.mock.calls.length, 1);

		t.mock.timers.tick(100);
		assert.equal(callback.mock.calls.length, 1);
	});

	await t.test('ignores calls during wait period', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100, {immediate: true});

		fn();
		fn();
		t.mock.timers.tick(100);

		assert.equal(callback.mock.calls.length, 1);
	});
});

test('return values', async t => {
	await t.test('returns undefined when not executing', async t => {
		const callback = t.mock.fn(() => 'result');
		const fn = debounce(callback, 100);

		assert.equal(fn(), undefined);
		assert.equal(callback.mock.calls.length, 0);
	});

	await t.test('returns result in immediate mode', async t => {
		const callback = t.mock.fn(() => 'result');
		const fn = debounce(callback, 100, {immediate: true});

		assert.equal(fn(), 'result');
	});

	await t.test('returns undefined when already pending in immediate mode', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn(() => 'result');
		const fn = debounce(callback, 100, {immediate: true});

		assert.equal(fn(), 'result');
		assert.equal(fn(), undefined);
	});
});

test('isPending', async () => {
	const fn = debounce(() => {}, 100);

	assert.equal(fn.isPending, false);
	fn();
	assert.equal(fn.isPending, true);
	fn.trigger();
	assert.equal(fn.isPending, false);
});

test('clear()', async t => {
	await t.test('cancels scheduled execution', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn();
		fn.clear();
		t.mock.timers.tick(100);

		assert.equal(callback.mock.calls.length, 0);
	});

	await t.test('clears stored arguments', async t => {
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn('arg1', 'arg2');
		fn.clear();
		fn.trigger();

		assert.deepEqual(callback.mock.calls[0].arguments, []);
	});
});

test('debounce timing', async t => {
	await t.test('does not execute before timeout elapses', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		setTimeout(fn, 100);
		setTimeout(fn, 150);

		t.mock.timers.tick(175);

		assert.equal(callback.mock.calls.length, 0);
	});
});

test('flush()', async t => {
	await t.test('executes immediately if pending', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn();
		t.mock.timers.tick(50);
		fn.flush();

		assert.equal(callback.mock.calls.length, 1);
	});

	await t.test('prevents timeout execution after flush', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn();
		t.mock.timers.tick(50);
		fn.flush();
		t.mock.timers.tick(100);

		assert.equal(callback.mock.calls.length, 1);
	});

	await t.test('does nothing if not pending', async t => {
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn.flush();

		assert.equal(callback.mock.calls.length, 0);
	});

	await t.test('allows subsequent calls after flush', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn();
		fn();
		fn.flush();

		assert.equal(callback.mock.calls.length, 1);

		setTimeout(fn, 250);
		t.mock.timers.tick(75);
		t.mock.timers.tick(250);
		t.mock.timers.tick(100);

		assert.equal(callback.mock.calls.length, 2);
	});
});

test('trigger()', async t => {
	await t.test('executes immediately', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn();
		fn.trigger();

		assert.equal(callback.mock.calls.length, 1);
	});

	await t.test('clears timer', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn();
		fn.trigger();
		t.mock.timers.tick(100);

		assert.equal(callback.mock.calls.length, 1);
	});

	await t.test('allows subsequent calls', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);

		fn();
		fn.trigger();
		fn();
		t.mock.timers.tick(100);

		assert.equal(callback.mock.calls.length, 2);
	});
});

test('context validation', async t => {
	await t.test('throws on different instances of same class', async () => {
		function MyClass() {}
		MyClass.prototype.debounced = debounce(() => {});

		const instance1 = new MyClass();
		const instance2 = new MyClass();

		instance1.debounced();

		assert.throws(() => {
			instance2.debounced();
		}, {message: 'Debounced method called with different contexts of the same prototype.'});
	});

	await t.test('allows different classes', async () => {
		function MyClass1() {}
		function MyClass2() {}

		const debouncedFunction = debounce(() => {});
		MyClass1.prototype.debounced = debouncedFunction;
		MyClass2.prototype.debounced = debouncedFunction;

		const instance1 = new MyClass1();
		const instance2 = new MyClass2();

		instance1.debounced();
		assert.doesNotThrow(() => {
			instance2.debounced();
		});
	});
});

test('edge cases', async t => {
	await t.test('zero wait time', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 0);

		fn();
		t.mock.timers.tick(1);

		assert.equal(callback.mock.calls.length, 1);
	});

	await t.test('long wait time', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 10_000);

		fn();
		t.mock.timers.tick(10_000);

		assert.equal(callback.mock.calls.length, 1);
	});

	await t.test('negative wait throws', async () => {
		assert.throws(() => {
			debounce(() => {}, -100);
		}, RangeError);
	});

	await t.test('boolean options throws', async () => {
		assert.throws(() => {
			debounce(() => {}, 100, true);
		}, {
			name: 'TypeError',
			message: 'The `options` parameter must be an object, not a boolean. Use `{immediate: true}` instead.',
		});
	});

	await t.test('non-function throws', async () => {
		assert.throws(() => {
			debounce(123, 100);
		}, TypeError);
	});

	await t.test('call and apply methods', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		const fn = debounce(callback, 100);
		const context = {a: 1};

		fn.call(context);
		fn.apply(context);
		t.mock.timers.tick(100);

		assert.equal(callback.mock.calls.length, 1);
	});

	await t.test('no calls made', async t => {
		t.mock.timers.enable();
		const callback = t.mock.fn();
		debounce(callback, 100);

		t.mock.timers.tick(100);

		assert.equal(callback.mock.calls.length, 0);
	});
});

test('multiple instances', async t => {
	t.mock.timers.enable();
	const callback1 = t.mock.fn();
	const callback2 = t.mock.fn();
	const fn1 = debounce(callback1, 100);
	const fn2 = debounce(callback2, 200);

	fn1();
	fn2();
	t.mock.timers.tick(100);

	assert.equal(callback1.mock.calls.length, 1);
	assert.equal(callback2.mock.calls.length, 0);

	t.mock.timers.tick(100);
	assert.equal(callback2.mock.calls.length, 1);
});
