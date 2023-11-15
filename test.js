/* eslint-env jasmine */
const sinon = require('sinon');
const debounce = require('./index.js');

describe('housekeeping', () => {
	it('should be defined as a function', () => {
		expect(typeof debounce).toEqual('function');
	});
});

describe('catch issue #3 - Debounced function executing early?', () => {
	// Use sinon to control the clock
	let clock;

	beforeEach(() => {
		clock = sinon.useFakeTimers();
	});

	afterEach(() => {
		clock.restore();
	});

	it('should debounce with fast timeout', () => {
		const callback = sinon.spy();

		// Set up debounced function with wait of 100
		const fn = debounce(callback, 100);

		// Call debounced function at interval of 50
		setTimeout(fn, 100);
		setTimeout(fn, 150);
		setTimeout(fn, 200);
		setTimeout(fn, 250);

		// Set the clock to 100 (period of the wait) ticks after the last debounced call
		clock.tick(350);

		// The callback should have been triggered once
		expect(callback.callCount).toEqual(1);
	});
});

describe('forcing execution', () => {
	// Use sinon to control the clock
	let clock;

	beforeEach(() => {
		clock = sinon.useFakeTimers();
	});

	afterEach(() => {
		clock.restore();
	});

	it('should not execute prior to timeout', () => {
		const callback = sinon.spy();

		// Set up debounced function with wait of 100
		const fn = debounce(callback, 100);

		// Call debounced function at interval of 50
		setTimeout(fn, 100);
		setTimeout(fn, 150);

		// Set the clock to 25 (period of the wait) ticks after the last debounced call
		clock.tick(175);

		// The callback should not have been called yet
		expect(callback.callCount).toEqual(0);
	});

	it('should execute prior to timeout when flushed', () => {
		const callback = sinon.spy();

		// Set up debounced function with wait of 100
		const fn = debounce(callback, 100);

		// Call debounced function at interval of 50
		setTimeout(fn, 100);
		setTimeout(fn, 150);

		// Set the clock to 25 (period of the wait) ticks after the last debounced call
		clock.tick(175);

		fn.flush();

		// The callback has been called
		expect(callback.callCount).toEqual(1);
	});

	it('should not execute again after timeout when flushed before the timeout', () => {
		const callback = sinon.spy();

		// Set up debounced function with wait of 100
		const fn = debounce(callback, 100);

		// Call debounced function at interval of 50
		setTimeout(fn, 100);
		setTimeout(fn, 150);

		// Set the clock to 25 (period of the wait) ticks after the last debounced call
		clock.tick(175);

		fn.flush();

		// The callback has been called here
		expect(callback.callCount).toEqual(1);

		// Move to past the timeout
		clock.tick(225);

		// The callback should have only been called once
		expect(callback.callCount).toEqual(1);
	});

	it('should not execute on a timer after being flushed', () => {
		const callback = sinon.spy();

		// Set up debounced function with wait of 100
		const fn = debounce(callback, 100);

		// Call debounced function at interval of 50
		setTimeout(fn, 100);
		setTimeout(fn, 150);

		// Set the clock to 25 (period of the wait) ticks after the last debounced call
		clock.tick(175);

		fn.flush();

		// The callback has been called here
		expect(callback.callCount).toEqual(1);

		// Schedule again
		setTimeout(fn, 250);

		// Move to past the new timeout
		clock.tick(400);

		// The callback should have been called again
		expect(callback.callCount).toEqual(2);
	});

	it('should not execute when flushed if nothing was scheduled', () => {
		const callback = sinon.spy();

		// Set up debounced function with wait of 100
		const fn = debounce(callback, 100);

		fn.flush();

		// The callback should not have been called
		expect(callback.callCount).toEqual(0);
	});

	it('should execute with correct args when called again from within timeout', () => {
		const callback = sinon.spy(n =>
			// Recursively call debounced function until n == 0
			--n && fn(n),
		);

		const fn = debounce(callback, 100);

		fn(3);

		clock.tick(125);
		clock.tick(250);
		clock.tick(375);

		expect(callback.callCount).toEqual(3);
		expect(callback.args[0]).toEqual([3]);
		expect(callback.args[1]).toEqual([2]);
		expect(callback.args[2]).toEqual([1]);
	});
});

describe('context check in debounced function', () => {
	it('should throw an error if debounced method is called with different contexts', () => {
		function MyClass() {}

		MyClass.prototype.debounced = debounce(() => {});

		const instance1 = new MyClass();
		const instance2 = new MyClass();

		// Call the debounced function on the first instance
		instance1.debounced();

		let errorThrown = false;
		try {
			// Attempt to call the same debounced function on a different instance
			instance2.debounced();
		} catch (error) {
			errorThrown = true;
			expect(error.message).toEqual('Debounced method called with different contexts.');
		}

		expect(errorThrown).toBeTruthy();
	});
});
