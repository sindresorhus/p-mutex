import {setTimeout} from 'node:timers/promises';
import test from 'ava';
import Mutex from './index.js';

test('Mutex locks and unlocks correctly', async t => {
	const mutex = new Mutex();
	t.false(mutex.isLocked, 'Mutex should initially be unlocked');

	await mutex.lock();
	t.true(mutex.isLocked, 'Mutex should be locked after lock()');

	mutex.unlock();
	t.false(mutex.isLocked, 'Mutex should be unlocked after unlock()');
});

test('Mutex handles concurrency using withLock', async t => {
	const mutex = new Mutex();
	let counter = 0;

	const increment = async () => {
		await mutex.withLock(async () => {
			const current = counter;
			await setTimeout(50); // Simulate async operation
			counter = current + 1;
		});
	};

	increment();
	increment();

	await setTimeout(200); // Wait for both increments to complete
	t.is(counter, 2, 'Counter should be 2 after two increments');
});

test('withLock releases lock on error', async t => {
	const mutex = new Mutex();

	const errorFunction = () => mutex.withLock(() => {
		throw new Error('Test error');
	});

	await t.throwsAsync(errorFunction, {message: 'Test error'}, 'Should throw specified error');
	t.false(mutex.isLocked, 'Mutex should be unlocked after error');

	await t.notThrowsAsync(mutex.withLock(() => Promise.resolve('ok')), 'Mutex should be usable after an error');
});

test('Unlocking after all promises resolve', async t => {
	const mutex = new Mutex();
	let resource = 0;

	await mutex.lock();
	const lockPromise = mutex.withLock(async () => {
		await setTimeout(100);
		resource += 1;
	});

	mutex.unlock(); // This should not actually unlock because withLock holds it

	await lockPromise; // Ensure withLock has completed
	t.is(resource, 1, 'Resource should only be incremented once');
	t.false(mutex.isLocked, 'Mutex should be unlocked after all operations');
});

test('Mutex handles rapid successive locking and unlocking', async t => {
	const mutex = new Mutex();
	let count = 0;

	await mutex.lock();
	count += 1;
	mutex.unlock();

	await mutex.lock();
	count += 1;
	mutex.unlock();

	t.is(count, 2, 'Mutex should allow locking and unlocking rapidly in succession');
});

test('Mutex works across multiple async functions', async t => {
	const mutex = new Mutex();
	const results = [];

	const asyncFunction = async id => {
		await mutex.lock();
		results.push(id);
		await setTimeout(Math.random() * 50); // Random delay
		mutex.unlock();
	};

	const promises = Array.from({length: 10}, (_, i) => asyncFunction(i));
	await Promise.all(promises);

	t.deepEqual(results.sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'Should process in order of locking despite async randomness');
});

test('Unlocking an unlocked mutex does not cause errors', async t => {
	const mutex = new Mutex();

	await mutex.lock();
	mutex.unlock();
	t.notThrows(() => mutex.unlock(), 'Unlocking an already unlocked mutex should not throw');

	// Confirm it still works after such an operation
	await t.notThrowsAsync(mutex.lock(), 'Mutex should still function correctly after unlocking an already unlocked mutex');
});

test('Error handling in withLock does not corrupt mutex state', async t => {
	const mutex = new Mutex();

	const errorProneTask = async () => mutex.withLock(async () => {
		throw new Error('Deliberate mistake');
	});

	await t.throwsAsync(errorProneTask, {message: 'Deliberate mistake'}, 'withLock should propagate errors correctly');
	t.false(mutex.isLocked, 'Mutex should not remain locked after an error');

	// Verify mutex is still functional after an error
	const result = await mutex.withLock(() => Promise.resolve('Success'));
	t.is(result, 'Success', 'Mutex should be usable after handling an error');
});

test('Multiple calls to lock without unlock between them', async t => {
	const mutex = new Mutex();

	// Lock the mutex to set the initial state.
	await mutex.lock();

	// Attempt to acquire a second lock. This should not resolve until the first lock is unlocked.
	let lockAcquired = false;
	const lockPromise = (async () => {
		await mutex.lock();
		lockAcquired = true; // This should only be set to true after the unlock allows this lock to acquire.
	})();

	// Ensure that the lock has not been prematurely acquired.
	await setTimeout(100); // Give some time for any potential premature execution.
	t.false(lockAcquired, 'Second lock should not be acquired until the first is unlocked');

	// Now unlock the first lock, allowing the second lock to acquire.
	mutex.unlock();

	// Wait for the second lock to be acquired.
	await lockPromise;
	t.true(lockAcquired, 'Second lock should be acquired after the first is unlocked');

	// Cleanup: Unlock the mutex to restore the initial state.
	mutex.unlock();
});

test('Mutex is not reentrant', async t => {
	const mutex = new Mutex();
	await mutex.lock();

	let deadlock = false;
	(async () => {
		await mutex.lock();
		deadlock = true;
	})();

	await setTimeout(100);
	t.false(deadlock, 'Mutex should not allow reentrant locking');

	mutex.unlock();
});

test('Mutex handles rapid consecutive lock/unlock', async t => {
	const mutex = new Mutex();

	for (let index = 0; index < 1000; index++) {
		await mutex.lock(); // eslint-disable-line no-await-in-loop
		mutex.unlock();
	}

	t.pass('Mutex handled rapid consecutive lock/unlock without error');
});

test('Mutex fairness', async t => {
	const mutex = new Mutex();
	const order = [];

	const lockAndRecord = async id => {
		await mutex.lock();
		order.push(id);
		mutex.unlock();
	};

	lockAndRecord(1);
	lockAndRecord(2);
	lockAndRecord(3);

	await setTimeout(200); // Allow all locks to process

	t.deepEqual(order, [1, 2, 3], 'Mutex should enforce fairness in locking order');
});

test('Mutex handles high concurrency', async t => {
	const mutex = new Mutex();
	let counter = 0;

	const incrementWithLock = async () => {
		await mutex.lock();
		const current = counter;
		await setTimeout(Math.random() * 10); // Simulate some async work
		counter = current + 1;
		mutex.unlock();
	};

	const tasks = Array.from({length: 1000}, () => incrementWithLock);
	await Promise.all(tasks.map(task => task()));

	t.is(counter, 1000, 'Counter should be incremented exactly 1000 times, demonstrating correct mutex usage under high concurrency');
});

test('Mutex maintains lock integrity with internal delays', async t => {
	const mutex = new Mutex();
	let value = 0;

	const delayedIncrement = async () => {
		await mutex.lock();
		const temporary = value;
		await setTimeout(100); // Simulate a delay
		value = temporary + 1;
		mutex.unlock();
	};

	const tasks = [delayedIncrement(), delayedIncrement()];
	await Promise.all(tasks);

	t.is(value, 2, 'Value should be exactly 2, ensuring no race conditions occurred with internal delays');
});
