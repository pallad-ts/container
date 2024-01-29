import "reflect-metadata";
import * as is from "predicates";
import { ClassConstructor, ServiceName } from "../types";
import { TypeReference } from "../TypeReference";
import { ERRORS } from "../errors";
import { ensureMetadataAttachedToClass } from "../classServiceMetadata";
import { ContainerArgument } from "../arguments/ContainerArgument";
import { ReferenceArgument } from "../arguments/ReferenceArgument";

const assertServiceNameOrContainerArg = is.assert(
	is.any(ServiceName.is, ContainerArgument.isType, TypeReference.is, is.func, is.undefined),
	"@Inject argument must be a string that represents service name, symbol, function or instance of ContainerArg or TypeRef"
);

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Inject(
	ref: ServiceName | ContainerArgument<any> | Function | TypeReference
): ParameterDecorator & PropertyDecorator;
// eslint-disable-next-line @typescript-eslint/naming-convention
export function Inject(): PropertyDecorator;
// eslint-disable-next-line @typescript-eslint/naming-convention
export function Inject(
	ref?: ServiceName | ContainerArgument<any> | Function | TypeReference
): PropertyDecorator | ParameterDecorator {
	assertServiceNameOrContainerArg(ref);

	return function (
		target: any,
		property: string | symbol,
		indexOrDescriptor?: number | TypedPropertyDescriptor<any>
	) {
		const isParameterDecorator = typeof indexOrDescriptor === "number";

		let arg: ReferenceArgument | ContainerArgument<any>;

		if (ref === undefined) {
			if (isParameterDecorator) {
				throw new Error(
					"Using @Inject decorator without ref for function arguments is prohibited"
				);
			}
			const designType = Reflect.getMetadata("design:type", target, property);
			arg = createReferenceForType(designType, `property ${property.toString()}`);
		} else if (TypeReference.is(ref)) {
			arg = ReferenceArgument.one.type(ref);
		} else if (ServiceName.is(ref)) {
			arg = ReferenceArgument.one.name(ref);
		} else if (ContainerArgument.isType(ref)) {
			arg = ref;
		} else {
			arg = createReferenceForType(
				ref as ClassConstructor<any>,
				isParameterDecorator
					? `constructor (of ${target.name}) argument nr: ${indexOrDescriptor}`
					: `property ${property.toString()}`
			);
		}

		if (isParameterDecorator) {
			ensureMetadataAttachedToClass(target).constructorArguments[
				indexOrDescriptor as number
			] = arg!;
		} else {
			ensureMetadataAttachedToClass(target.constructor).propertiesInjectors.set(
				property,
				arg!
			);
		}
	};
}

function createReferenceForType(func: ClassConstructor<any>, ...args: string[]) {
	if (TypeReference.isValidTarget(func)) {
		return ReferenceArgument.one.type(func);
	}
	throw ERRORS.AUTO_WIRING_FAILED.create(args[0]);
}
