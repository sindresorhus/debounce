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

		let errorThrown = false;
		try {
			instance2.debounced();
		} catch (error) {
			errorThrown = true;
			assert.strictEqual(error.message, 'Debounced method called with different contexts.', 'Error message should match');
		}

		assert.ok(errorThrown, 'An error should have been thrown');
	});
});
