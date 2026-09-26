export default function debounce(function_, wait = 100, options = {}) {
	if (typeof function_ !== 'function') {
		throw new TypeError(`Expected the first parameter to be a function, got \`${typeof function_}\`.`);
	}

	if (wait < 0) {
		throw new RangeError('`wait` must not be negative.');
	}

	if (typeof options === 'boolean') {
		throw new TypeError('The `options` parameter must be an object, not a boolean. Use `{immediate: true}` instead.');
	}

	const {immediate} = options;

	let storedContext;
	let storedArguments;
	let timeoutId;
	let timestamp;

	function discard() {
		storedContext = undefined;
		storedArguments = undefined;
	}

	function run() {
		const callContext = storedContext;
		const callArguments = storedArguments;
		discard();
		return function_.apply(callContext, callArguments);
	}

	function later() {
		const last = Date.now() - timestamp;

		if (last < wait && last >= 0) {
			timeoutId = setTimeout(later, wait - last);
		} else {
			timeoutId = undefined;

			if (immediate) {
				// The leading edge already ran the call, so there is no trailing call to make. Drop the stored call, or it would leak into a later `trigger()` and keep the context check armed for a burst that is already over.
				discard();
			} else {
				run();
			}
		}
	}

	const debounced = function (...arguments_) {
		if (
			storedContext
			&& this !== storedContext
			&& Object.getPrototypeOf(this) === Object.getPrototypeOf(storedContext)
		) {
			throw new Error('Debounced method called with different contexts of the same prototype.');
		}

		storedContext = this; // eslint-disable-line unicorn/no-this-assignment
		storedArguments = arguments_;
		timestamp = Date.now();

		const callNow = immediate && !timeoutId;

		timeoutId ??= setTimeout(later, wait);

		return callNow ? run() : undefined;
	};

	Object.defineProperty(debounced, 'isPending', {
		get() {
			return timeoutId !== undefined;
		},
	});

	function cancel() {
		if (timeoutId === undefined) {
			return;
		}

		clearTimeout(timeoutId);
		timeoutId = undefined;
	}

	debounced.clear = () => {
		cancel();
		discard();
	};

	debounced.flush = () => {
		// Keyed on the stored call rather than the timer. In immediate mode the timer is still armed after the leading edge ran, but there is no call left to run, and forcing one would call the function a second time with no arguments.
		if (storedArguments === undefined) {
			return;
		}

		debounced.trigger();
	};

	debounced.trigger = () => {
		// Cancel before running so that a call the function makes from inside itself is not cancelled.
		cancel();
		run();
	};

	return debounced;
}
