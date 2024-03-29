import { Domain, formatCodeFactory, ErrorDescriptor } from "@pallad/errors";
import { Lookup } from "./Lookup";

const code = formatCodeFactory("E_CONTAINER_%c");

export const errorsDomain = new Domain();

export const ERRORS = errorsDomain.addErrorsDescriptorsMap({
	SERVICE_NOT_FOUND: ErrorDescriptor.useMessageFormatter(
		code(1),
		(name: string) => `Service "${name}" does not exist`
	),
	AMBIGUOUS_SERVICE: ErrorDescriptor.useMessageFormatter(
		code(2),
		(serviceNameList: string[], lookupOrLookupDescription: Lookup | string) =>
			`Multiple services found (${serviceNameList.join(", ")}) with following lookup: ${lookupOrLookupDescription}`
	),
	NO_MATCHING_SERVICE: ErrorDescriptor.useMessageFormatter(
		code(3),
		(lookup: Lookup) => `No matching service for following lookup: ${lookup}`
	),
	CIRCULAR_DEPENDENCY_DETECTED: ErrorDescriptor.useMessageFormatter(
		code(4),
		(dependencyNameList: string[]) =>
			`Circular dependency found: ${dependencyNameList.join(" -> ")}`
	),
	INVALID_SERVICE_ARGUMENTS_LENGTH: ErrorDescriptor.useMessageFormatter(
		code(5),
		(name: string, requiredArgumentsLength: number, providedArgumentsLength: number) =>
			`Invalid service "${name}" definition. Required constructor arguments: ${requiredArgumentsLength}, provided: ${providedArgumentsLength}`
	),
	MISSING_INJECT_DECORATOR: ErrorDescriptor.useMessageFormatter(
		code(6),
		(position: number) =>
			`Missing @Inject decorator for argument at position "${position}". Every constructor argument needs to have @Inject decorator`
	),
	MISSING_CONFIG_VALUE: ErrorDescriptor.useMessageFormatter(
		code(7),
		(path: string) =>
			`Config at path "${path}" is not defined and default value is not provided`
	),
	ALREADY_DEFINED: ErrorDescriptor.useMessageFormatter(
		code(8),
		(name: string) => `Service "${name}" already defined`
	),
	AUTO_WIRING_FAILED: ErrorDescriptor.useMessageFormatter(
		code(9),
		(typeDescription: string) =>
			`Inferred type for ${typeDescription} is an interface, union type or built-in object that is not supported`
	),
	AUTO_WIRING_NO_METADATA: ErrorDescriptor.useDefaultMessage(
		code(10),
		'Metadata are missing. Make sure you have compiled typescript project with "emitDecoratorMetadata" option enabled'
	),
	CONFIG_PROVIDER_NOT_ATTACHED: ErrorDescriptor.useDefaultMessage(
		code(11),
		"Config provider not attached to container. You need to use config middleware first."
	),
	OWNER_CANNOT_BE_CHANGED: ErrorDescriptor.useDefaultMessage(
		code(12),
		"Owner of definition cannot be changed. Make sure you are not using same definition in multiple containers"
	),
	DEFINITION_WITHOUT_CONTAINER: ErrorDescriptor.useMessageFormatter(
		code(13),
		(name: string) => `Cannot create service "${name}" due to lack of assigned container`
	),
	CLASS_IS_NOT_A_SERVICE: ErrorDescriptor.useMessageFormatter(
		code(14),
		(className: string) => `Class ${className} has not been marked as @Service`
	),
	DEFINITION_IS_LOCKED: ErrorDescriptor.useMessageFormatter(
		code(15),
		(defName: string) => `Definition "${defName}" is locked and cannot be modified`
	),
	INVALID_DEFINITION_OR_CLASS: ErrorDescriptor.useMessageFormatter(
		code(16),
		(value: unknown) =>
			`Invalid definition or class "${value}". Expected class or Definition but "${typeof value}" given`
	),
	INVALID_TYPE_REFERENCE_TARGET: ErrorDescriptor.useMessageFormatter(
		code(17),
		(value: unknown) =>
			`Invalid type reference "${value}". Expected non-internal class but "${typeof value}" given`
	),
});
