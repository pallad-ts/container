import { ContainerArgument } from "./ContainerArgument";
import { Container } from "../Container";

/**
 * Applies transformer function on result of provided argument
 */
export class TransformArgument<TInput, TResult> extends ContainerArgument<TResult> {
	constructor(
		private readonly transformer: (value: TInput) => TResult,
		private readonly arg: ContainerArgument<TInput>
	) {
		super();
		Object.freeze(this);
	}

	async resolve(container: Container): Promise<TResult> {
		return this.transformer(await this.arg.resolve(container));
	}

	dependencies(container: Container) {
		return this.arg.dependencies(container);
	}
}
