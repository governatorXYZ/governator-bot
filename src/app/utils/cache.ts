export class Cache {
	private cache: Map<any, any>;

	constructor() {
		this.cache = new Map();
	}

	get(key) {
		if (!this.cache.has(key)) return 0;

		const val = this.cache.get(key);

		this.cache.delete(key);
		this.cache.set(key, val);

		return val;
	}

	set(key, value) {
		this.cache.delete(key);
		this.cache.set(key, value);
	}

	clear(key) {
		this.cache.delete(key);
	}

}