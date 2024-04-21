import { Definition } from "./Definition";
import { fromConstructor } from "./serviceFactories";
import { ClassConstructor, ServiceName } from "./types";
import { ERRORS } from "./errors";

require("reflect-metadata");

const METADATA_KEY = Symbol("@pallad/container/ServiceMetadata");
const DEFINITION_KEY = Symbol("@pallad/container/Definition");

export interface ClassServiceMetadata {
	name?: ServiceName;
	clazz: ClassConstructor<any>;
	constructorArguments: any[];
	propertiesInjectors: Map<string | symbol, any>;
	annotations: any[];
}

/**
 * Creates service metadata data for given class if it doesn't exist
 */
export function ensureMetadataAttachedToClass(clazz: ClassConstructor<any>): ClassServiceMetadata {
	let data: ClassServiceMetadata = Reflect.getMetadata(METADATA_KEY, clazz);
	if (!data) {
		data = {
			clazz: clazz,
			propertiesInjectors: new Map(),
			constructorArguments: [],
			annotations: [],
		};
		Reflect.defineMetadata(METADATA_KEY, data, clazz);
	}
	return data;
}

export function getClassServiceMetadata(clazz: ClassConstructor<any>): ClassServiceMetadata | undefined {
	return Reflect.getMetadata(METADATA_KEY, clazz);
}

export function extractDefinitionFromClass<T>(clazz: ClassConstructor<T>) {
	const definition = Reflect.getMetadata(DEFINITION_KEY, clazz);
	if (definition) {
		return definition;
	}
	let data: ClassServiceMetadata = Reflect.getMetadata(METADATA_KEY, clazz);
	if (data) {
		const definition = createDefinitionFromMetadata(data, clazz);
		Reflect.defineMetadata(DEFINITION_KEY, definition, clazz);
		return definition;
	}

	throw ERRORS.CLASS_IS_NOT_A_SERVICE.create(clazz.name);
}

function createDefinitionFromMetadata(
	metadata: ClassServiceMetadata,
	constructor: ClassConstructor<any>
) {
	assertValidServiceDefinition(constructor, metadata);
	const definition = Definition.useFactory(
		(...args: unknown[]) => {
			const constructorArgs = args.slice(0, metadata.constructorArguments.length);
			const service = fromConstructor(constructor)(...constructorArgs);

			// inject to properties
			const propertiesInjectionsStartIndex = metadata.constructorArguments.length;
			let propertyInjectionIndex = 0;
			for (const [propertyName] of metadata.propertiesInjectors.entries()) {
				service[propertyName] =
					args[propertiesInjectionsStartIndex + propertyInjectionIndex++];
			}
			return service;
		},
		{
			name: metadata.name,
			type: constructor,
		}
	);

	const args = metadata.constructorArguments.concat(
		Array.from(metadata.propertiesInjectors.values())
	);

	return definition.withArguments(...args).annotate(...metadata.annotations);
}

function assertValidServiceDefinition(constructor: Function, metadata: ClassServiceMetadata) {
	if (constructor.length > metadata.constructorArguments.length) {
		throw ERRORS.INVALID_SERVICE_ARGUMENTS_LENGTH.create(
			metadata.name!.toString(),
			constructor.length,
			metadata.constructorArguments.length
		);
	}

	for (let i = 0; i < metadata.constructorArguments.length; i++) {
		const arg = metadata.constructorArguments[i];
		if (!arg) {
			throw ERRORS.MISSING_INJECT_DECORATOR.create(i);
		}
	}
}
