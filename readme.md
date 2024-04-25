# p-mutex

> Async [mutex lock](https://en.wikipedia.org/wiki/Lock_(computer_science)) for managing access to a shared resource

It provides a safe and easy way to ensure that only one operation accesses a particular resource at a time, preventing race conditions and ensuring data integrity.

## Install

```sh
npm install p-mutex
```

## Usage

```js
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

## API

### `Mutex()`

Creates a new mutex object.

### `.withLock(task)`

Automatically manages the lock during the execution of the given `task`.

It ensures that the mutex is locked before the `task` executes and automatically releases the lock afterward, even if an error occurs during the execution.

Parameters:
- `task`: A function that performs the actions you want to execute while the lock is held. It can be async.

Returns the result of the `task` function.

> [!TIP]
> Prefer using this method for most use cases as it handles the complexities of lock management and is less prone to errors. Use the lock and unlock methods directly only when you need more control over the lock management process.

### `.lock()`

Acquires the lock.

Returns a promise that resolves when the lock has been acquired.

> [!IMPORTANT]
> Ensure every `.lock()` is paired with `.unlock()`. Use a `try...finally` block for safe lock management; the finally block ensures the lock is released, even if an error occurs.

### `.unlock()`

Releases the lock.

### `.isLocked`

Indicates whether the mutex is currently locked.

## Use cases

- **Concurrent Database Updates:** Ensures that database write operations do not interfere with each other, maintaining data integrity.
- **File Writing Operations:** Manages simultaneous file write access in apps, preventing file corruption.
- **Initialization Synchronization:** Ensures that shared resources are initialized only once in an app, even when multiple async tasks attempt access concurrently.
- **API Request Sequencing:** Coordinates the order of API calls that modify data on a server to prevent race conditions and maintain consistent state.
