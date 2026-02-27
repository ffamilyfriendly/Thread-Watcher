export default class Logger {
	static default_instance = new this();
	constructor() {}

	static get_instance() {
		return Logger.default_instance;
	}
}
