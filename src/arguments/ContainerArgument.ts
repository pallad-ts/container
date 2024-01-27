import { Container } from "../Container";
import { Definition } from "../Definition";
import { TypeCheck } from "@pallad/type-check";

const TYPE_CHECK = new TypeCheck("@pallad/container/ContainerArgument");

export abstract class ContainerArgument<T> {
	constructor() {
		TYPE_CHECK.assign(this);
	}

	/**
	 * Returns argument value
	 */
	abstract resolve(container: Container): Promise<T>;

	/**
	 * Returns a definition or list of definitions of services that giver argument requires
	 */
	abstract dependencies(container: Container): Iterable<Definition>;

	static isType<T>(value: unknown): value is ContainerArgument<T> {
		return TYPE_CHECK.isType(value);
	}
}
