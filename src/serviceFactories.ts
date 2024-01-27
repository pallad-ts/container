import { ClassConstructor, ServiceFactory } from "./types";

export function fromConstructor(constructor: ClassConstructor<any>): ServiceFactory {
	return function createFromConstructor(...args: any[]) {
		return new constructor(...args);
	};
}

export function fromFactory(factory: (...args: any[]) => any): ServiceFactory {
	return factory;
}

export function fromValue(value: any): ServiceFactory {
	return function createServiceFromValue() {
		return value;
	};
}
