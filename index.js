import Queue from 'yocto-queue';

export default class Mutex {
	#queue = new Queue();
	#isLocked = false;

	async lock() {
		if (!this.#isLocked) {
			this.#isLocked = true;
			return;
		}

		return new Promise(resolve => {
			this.#queue.enqueue(resolve);
		});
	}

	unlock() {
		if (this.#queue.size > 0) {
			const resolve = this.#queue.dequeue();
			resolve();
		} else {
			this.#isLocked = false;
		}
	}

	async withLock(task) {
		try {
			await this.lock();
			return await task();
		} finally {
			this.unlock();
		}
	}

	get isLocked() {
		return this.#isLocked;
	}
}
