import * as is from "predicates";
import { ContainerArgument } from "./ContainerArgument";
import { Container } from "../Container";
import { getConfigProviderForContainer } from "../middlewares/config";
import { TypeCheck } from "@pallad/type-check";

const assertNotBlank = is.assert(is.notBlank, 'Config "path" cannot be blank');

const TYPE_CHECK = new TypeCheck("@pallad/container/ContainerArgument");

export class ConfigArgument<T> extends ContainerArgument<T> {
	public readonly hasDefaultValue: boolean;

	constructor(
		public readonly path: string,
		public readonly defaultValue?: T
	) {
		super();
		assertNotBlank(this.path);
		TYPE_CHECK.assign(this);
		this.hasDefaultValue = arguments.length > 1;
		Object.freeze(this);
	}

	static create<T>(path: string, defaultValue?: T): ConfigArgument<T>;
	static create<T>(...args: [string, undefined | T]): ConfigArgument<T> {
		return new ConfigArgument<T>(...args);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async resolve(container: Container): Promise<T> {
		return getConfigProviderForContainer(container)(this);
	}

	dependencies() {
		return [];
	}

	static isType<T>(value: unknown): value is ConfigArgument<T> {
		return TYPE_CHECK.isType(value);
	}
}
