import { ConfigRequestArg } from "../args/ConfigRequestArg";
import { ensureMetadataAttachedToClass } from "../classServiceMetadata";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Config<T>(...args: [string, undefined | T] | [string]) {
	const request = ConfigRequestArg.create(...(args as [string, undefined | T]));

	return function (
		target: any,
		property: string | symbol | undefined,
		indexOrDescriptor?: number | TypedPropertyDescriptor<any>
	) {
		const isParameterDecorator = typeof indexOrDescriptor === "number";
		if (isParameterDecorator) {
			ensureMetadataAttachedToClass(target).constructorArguments[
				indexOrDescriptor as number
			] = request;
		} else if (property) {
			ensureMetadataAttachedToClass(target.constructor).propertiesInjectors.set(
				property,
				request
			);
		}
	};
}
