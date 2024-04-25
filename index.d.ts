/**
Async [mutex lock](https://en.wikipedia.org/wiki/Lock_(computer_science)) for managing access to a shared resource.

@example
```
import Mutex from 'p-mutex';

const mutex = new Mutex();

const sharedArray = [];

async function addToSharedArray(item) {
	await mutex.withLock(async () => {
		const item = await getItem();
		sharedArray.push(item);
	});
}

addToSharedArray('A');
addToSharedArray('B');
```
*/
export default class Mutex {
	/**
	Indicates whether the mutex is currently locked.
	*/
	readonly isLocked: boolean;

	/**
	Automatically manages the lock during the execution of the given `task`.

	It ensures that the mutex is locked before the `task` executes and automatically releases the lock afterward, even if an error occurs during the execution.

	@param task - A function that performs the actions you want to execute while the lock is held. It can be async.
	@returns The result of the `task` function.

	- Tip: Prefer using this method for most use cases as it handles the complexities of lock management and is less prone to errors. Use the lock and unlock methods directly only when you need more control over the lock management process.
	*/
	withLock<T>(task: () => (Promise<T> | T)): Promise<T>;

	/**
	Acquires the lock.

	@returns A promise that resolves when the lock has been acquired.

	- Important: Ensure every `.lock()` is paired with `.unlock()`. Use a `try...finally` block for safe lock management; the finally block ensures the lock is released, even if an error occurs.
	*/
	lock(): Promise<void>;

	/**
	Releases the lock.
	*/
	unlock(): void;
}
