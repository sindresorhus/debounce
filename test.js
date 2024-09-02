const test = require('node:test');
const assert = require('node:assert');
const sinon = require('sinon');
const debounce = require('./index.js');

// TODO: Use Node.js test timer mocking.

test('housekeeping', async () => {
	assert.strictEqual(typeof debounce, 'function', 'debounce should be a function');
});

test('catch issue #3 - Debounced function executing early?', async t => {
	let clock;

	await t.test('should debounce with fast timeout', async () => {
		clock = sinon.useFakeTimers();
		const callback = sinon.spy();

		const fn = debounce(callback, 100);

		setTimeout(fn, 100);
		setTimeout(fn, 150);
		setTimeout(fn, 200);
		setTimeout(fn, 250);

		clock.tick(350);

		assert.strictEqual(callback.callCount, 1, 'Callback should be triggered once');
		clock.restore();
	});
});

test('forcing execution', async t => {
	let clock;

	await t.test('should not execute prior to timeout', async () => {
		clock = sinon.useFakeTimers();
		const callback = sinon.spy();

		const fn = debounce(callback, 100);

		setTimeout(fn, 100);
		setTimeout(fn, 150);

		clock.tick(175);

		assert.strictEqual(callback.callCount, 0, 'Callback should not be called yet');
		clock.restore();
	});

	await t.test('should execute prior to timeout when flushed', async () => {
		clock = sinon.useFakeTimers();
		const callback = sinon.spy();

		const fn = debounce(callback, 100);

		setTimeout(fn, 100);
		setTimeout(fn, 150);

		clock.tick(175);

		fn.flush();

		assert.strictEqual(callback.callCount, 1, 'Callback should have been called');
		clock.restore();
	});

	await t.test('should not execute again after timeout when flushed before the timeout', async () => {
		clock = sinon.useFakeTimers();
		const callback = sinon.spy();

		const fn = debounce(callback, 100);

		setTimeout(fn, 100);
		setTimeout(fn, 150);

		clock.tick(175);

		fn.flush();

		assert.strictEqual(callback.callCount, 1, 'Callback should have been called once');

		clock.tick(225);

		assert.strictEqual(callback.callCount, 1, 'Callback should not be called again after timeout');
		clock.restore();
	});

	await t.test('should not execute on a timer after being flushed', async () => {
		clock = sinon.useFakeTimers();
		const callback = sinon.spy();

		const fn = debounce(callback, 100);

		setTimeout(fn, 100);
		setTimeout(fn, 150);

		clock.tick(175);

		fn.flush();

		assert.strictEqual(callback.callCount, 1, 'Callback should have been called once');

		setTimeout(fn, 250);

		clock.tick(400);

		assert.strictEqual(callback.callCount, 2, 'Callback should be called again after new timeout');
		clock.restore();
	});

	await t.test('should not execute when flushed if nothing was scheduled', async () => {
		const callback = sinon.spy();

		const fn = debounce(callback, 100);

		fn.flush();

		assert.strictEqual(callback.callCount, 0, 'Callback should not be called when flushed without scheduling');
	});

	await t.test('should execute with correct args when called again from within timeout', async () => {
		clock = sinon.useFakeTimers();

		const callback = sinon.spy(n => {
			--n;

			if (n > 0) {
				fn(n);
			}
		});

		const fn = debounce(callback, 100);

		fn(3);

		clock.tick(125);
		clock.tick(250);
		clock.tick(375);

		assert.strictEqual(callback.callCount, 3, 'Callback should be called three times');
		assert.deepStrictEqual(callback.args[0], [3], 'First call args should match');
		assert.deepStrictEqual(callback.args[1], [2], 'Second call args should match');
		assert.deepStrictEqual(callback.args[2], [1], 'Third call args should match');
		clock.restore();
	});
});

test('context check in debounced function', async t => {
	await t.test('should throw an error if debounced method is called with different contexts', async () => {
		function MyClass() {}

		MyClass.prototype.debounced = debounce(() => {});

		const instance1 = new MyClass();
		const instance2 = new MyClass();

		instance1.debounced();

		assert.throws(() => {
			instance2.debounced();
		}, {
			message: 'Debounced method called with different contexts of the same prototype.',
		});
	});
});

test('immediate execution', async t => {
	let clock;

	await t.test('should execute immediately when immediate is true', async () => {
		clock = sinon.useFakeTimers();
		const callback = sinon.spy();

		const fn = debounce(callback, 100, true);

		fn();
		assert.strictEqual(callback.callCount, 1, 'Callback should be triggered immediately');

		clock.tick(100);
		assert.strictEqual(callback.callCount, 1, 'Callback should not be triggered again after wait time');

		clock.restore();
	});

	await t.test('should execute immediately when immediate is in options object', async () => {
		clock = sinon.useFakeTimers();
		const callback = sinon.spy();

		const fn = debounce(callback, 100, {immediate: true});

		fn();
		assert.strictEqual(callback.callCount, 1, 'Callback should be triggered immediately');

		clock.tick(100);
		assert.strictEqual(callback.callCount, 1, 'Callback should not be triggered again after wait time');

		clock.restore();
	});

	await t.test('should not execute immediately when immediate is false', async () => {
		clock = sinon.useFakeTimers();
		const callback = sinon.spy();

		const fn = debounce(callback, 100, {immediate: false});

		fn();
		clock.tick(50);
		assert.strictEqual(callback.callCount, 0, 'Callback should not be triggered immediately');

		clock.tick(50);
		assert.strictEqual(callback.callCount, 1, 'Callback should be triggered after wait time');

		clock.restore();
	});
});

test('debounce edge cases', async t => {
	const clock = sinon.useFakeTimers();

	await t.test('zero wait time', async () => {
		const callback = sinon.spy();
		const fn = debounce(callback, 0);

		fn();
		clock.tick(1);

		assert.strictEqual(callback.callCount, 1, 'Callback should be triggered immediately for zero wait time');
	});

	await t.test('negative wait time error handling', async () => {
		assert.throws(() => {
			debounce(() => {}, -100);
		}, RangeError, 'Debounce should throw RangeError for negative wait time');
	});

	await t.test('repeated rapid calls', async () => {
		const callback = sinon.spy();
		const fn = debounce(callback, 100);

		fn();
		fn();
		fn();
		clock.tick(100);

		assert.strictEqual(callback.callCount, 1, 'Callback should be called only once after rapid calls');
	});

	await t.test('single call', async () => {
		const callback = sinon.spy();
		const fn = debounce(callback, 100);

		fn();
		clock.tick(100);

		assert.strictEqual(callback.callCount, 1, 'Callback should be called once for a single call');
	});

	await t.test('long wait time', async () => {
		const callback = sinon.spy();
		const fn = debounce(callback, 10_000);

		fn();
		clock.tick(10_000);

		assert.strictEqual(callback.callCount, 1, 'Callback should be called once after long wait time');
	});

	await t.test('function arguments preservation', async () => {
		const callback = sinon.spy();
		const fn = debounce(callback, 100);

		fn('test', 123);
		clock.tick(100);

		assert.deepStrictEqual(callback.args[0], ['test', 123], 'Arguments should be preserved and passed correctly');
	});

	await t.test('context preservation', async () => {
		const callback = sinon.spy();
		const context = {a: 1};

		// Bind the context to the debounced function
		const fn = debounce(callback.bind(context), 100);

		fn();
		clock.tick(100);

		assert.strictEqual(callback.firstCall.thisValue, context, 'Context should be preserved');
	});

	await t.test('clear method', async () => {
		const callback = sinon.spy();
		const fn = debounce(callback, 100);

		fn();
		fn.clear();
		clock.tick(100);

		assert.strictEqual(callback.callCount, 0, 'Clear method should cancel scheduled execution');
	});

	await t.test('non-function parameter error handling', async () => {
		assert.throws(() => {
			debounce(123, 100);
		}, TypeError, 'Debounce should throw TypeError if first parameter is not a function');
	});

	clock.restore();
});

test('multiple independent instances', async () => {
	const clock = sinon.useFakeTimers();
	const callback1 = sinon.spy();
	const callback2 = sinon.spy();
	const fn1 = debounce(callback1, 100);
	const fn2 = debounce(callback2, 200);

	fn1();
	fn2();
	clock.tick(100);

	assert.strictEqual(callback1.callCount, 1, 'First callback should be called once');
	assert.strictEqual(callback2.callCount, 0, 'Second callback should not be called yet');

	clock.tick(100);
	assert.strictEqual(callback2.callCount, 1, 'Second callback should be called once');

	clock.restore();
});

test('execution after timeout with multiple calls', async () => {
	const clock = sinon.useFakeTimers();
	const callback = sinon.spy();
	const fn = debounce(callback, 100);

	fn();
	fn();
	fn();
	clock.tick(300);

	assert.strictEqual(callback.callCount, 1, 'Callback should be executed only once after timeout');

	clock.restore();
});

test('debounce method cancelled before execution', async () => {
	const clock = sinon.useFakeTimers();
	const callback = sinon.spy();
	const fn = debounce(callback, 100);

	fn();
	fn.clear();
	clock.tick(100);

	assert.strictEqual(callback.callCount, 0, 'Callback should not be executed after being cancelled');

	clock.restore();
});

test('non-standard function calls', async () => {
	const clock = sinon.useFakeTimers();
	const callback = sinon.spy();
	const fn = debounce(callback, 100);
	const context = {a: 1};

	fn.call(context);
	fn.apply(context);
	clock.tick(100);

	assert.strictEqual(callback.callCount, 1, 'Callback should handle call and apply methods correctly');

	clock.restore();
});

test('no calls made', async () => {
	const clock = sinon.useFakeTimers();
	const callback = sinon.spy();
	debounce(callback, 100);

	clock.tick(100);

	assert.strictEqual(callback.callCount, 0, 'Callback should not be executed if debounce function is not called');

	clock.restore();
});

test('calling flush method without any scheduled execution', async () => {
	const callback = sinon.spy();
	const fn = debounce(callback, 100);

	fn.flush();

	assert.strictEqual(callback.callCount, 0, 'Callback should not be executed if flush is called without any scheduled execution');
});

test('calling the trigger function should run it immediately', async () => {
	const clock = sinon.useFakeTimers();
	const callback = sinon.spy();
	const fn = debounce(callback, 100);

	fn();
	fn.trigger();

	assert.strictEqual(callback.callCount, 1, 'Callback should be called once when using trigger method');

	clock.tick(100);

	assert.strictEqual(callback.callCount, 1, 'Callback should stay at one call after timeout');

	clock.restore();
});

test('calling the trigger should not affect future function calls', async () => {
	const clock = sinon.useFakeTimers();
	const callback = sinon.spy();
	const fn = debounce(callback, 100);

	fn();
	fn.trigger();
	fn();

	assert.strictEqual(callback.callCount, 1, 'Callback should be called once when using trigger method');

	clock.tick(100);

	assert.strictEqual(callback.callCount, 2, 'Callback should total two calls after timeout');

	clock.restore();
});
