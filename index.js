// `setTimeout` clamps a delay above this to 1 ms, so a larger `wait` would not wait at all: the timer would wake straight away and re-arm, and it keeps doing so for as long as the delay left to wait stays out of range.
const maximumTimeout = (2 ** 31) - 1;

export default function debounce(function_, wait = 100, options = {}) {
	if (typeof function_ !== 'function') {
		throw new TypeError(`Expected the first parameter to be a function, got \`${typeof function_}\`.`);
	}

	if (!(wait >= 0) || wait > maximumTimeout) {
		throw new RangeError(`\`wait\` must be a number between 0 and ${maximumTimeout}, got \`${wait}\`.`);
	}

	if (typeof options === 'boolean') {
		throw new TypeError('The `options` parameter must be an object, not a boolean. Use `{immediate: true}` instead.');
	}

	// A `= {}` default only covers `undefined`, so a forwarded `null` would otherwise fail here with an internal destructuring error instead of being treated as no options.
	const {immediate} = options ?? {};

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
		// A negative `last` means the wall clock moved backwards after the call, so the elapsed time is unknowable. Run rather than reschedule against a clock that is behind.
		const last = Date.now() - timestamp;

		if (last < wait && last >= 0) {
			timeoutId = setTimeout(later, wait - last);
		} else {
			timeoutId = undefined;

			if (immediate) {
				// The leading edge already ran the call, so there is no trailing call to make. Drop the stored call, or it would leak into a later `trigger()`.
				discard();
			} else {
				run();
			}
		}
	}

	// Two instances calling a debounced prototype method within one wait share one timer, so one of the calls is silently dropped (#8), but this is deliberately not checked. Telling that apart from a handler shared on purpose (#43) needs a prototype walk on every receiver change, which was slow and kept missing real cases or throwing on valid ones.
	const debounced = function (...arguments_) {
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
		// Cancel before running, so that a call the function makes from inside itself survives, and so that the timer is already gone if it throws and cannot run it a second time.
		cancel();
		run();
	};

	return debounced;
}
