export class Cache {
	private cache: Map<any, any>;
	// private readonly capacity: any;

	constructor() {
		this.cache = new Map();
		// this.capacity = capacity;
	}

	get(key) {
		if (!this.cache.has(key)) return -1;

		const val = this.cache.get(key);

		this.cache.delete(key);
		this.cache.set(key, val);

		return val;
	}

	// Implementing Put method
	set(key, value) {
		this.cache.delete(key);
		this.cache.set(key, value);

		// if (this.cache.size === this.capacity) {
		// 	this.cache.delete(this.cache.keys().next().value);
		// 	this.cache.set(key, value);
		// } else {
		// 	this.cache.set(key, value);
		// }
	}

}