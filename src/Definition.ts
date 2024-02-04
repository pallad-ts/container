import { ClassConstructor, ServiceFactory, ServiceName } from "./types";
import * as factories from "./serviceFactories";
import { TypeReference } from "./TypeReference";
import { Container } from "./Container";
import * as is from "predicates";
import { ERRORS } from "./errors";
import { randomName } from "./utils/randomName";
import { TypeCheck } from "@pallad/type-check";
import { ReferenceArgument } from "./arguments/ReferenceArgument";
import { Lookup } from "./Lookup";
import { extractDefinitionFromClass } from "./classServiceMetadata";

const TYPE_CHECK = new TypeCheck<Definition>("@pallad/container/Definition");

function resolveOptions(options: Definition.Options | undefined): Definition.Options.Shape {
	if (options === undefined) {
		return {};
	}

	if (is.string(options) || typeof options === "symbol") {
		return { name: options };
	}

	return options;
}

export class Definition extends TYPE_CHECK.clazz {
	#arguments: unknown[] = [];
	#annotations: unknown[] = [];
	#factory!: ServiceFactory;
	#finalType?: TypeReference;
	#owner?: Container;
	#isLocked = false;
	#name!: ServiceName;

	get arguments() {
		return this.#arguments.slice();
	}

	get owner() {
		return this.#owner;
	}

	get finalType() {
		return this.#finalType;
	}

	get annotations(): unknown[] {
		return this.#annotations.slice();
	}

	get factory() {
		return this.#factory;
	}

	get name() {
		return this.#name;
	}

	constructor(
		factory: ServiceFactory,
		name: ServiceName = randomName(),
		type?: TypeReference | ClassConstructor<any>
	) {
		super();
		this.#name = name;
		this.#factory = factory;
		this.#finalType = type
			? TypeReference.is(type)
				? type
				: new TypeReference(type)
			: undefined;
	}

	/**
	 * Creates definition that returns specific value as service
	 */
	static useValue(value: unknown, name?: ServiceName) {
		return new Definition(
			factories.fromValue(value),
			name ?? randomName(Object.getPrototypeOf(value).constructor.name),
			TypeReference.createFromValue(value)
		);
	}

	/**
	 * Creates definition that returns instance of given class as service
	 */
	static useConstructor(constructor: ClassConstructor<any>, name?: ServiceName) {
		return new Definition(
			factories.fromConstructor(constructor),
			name ? name : randomName(constructor.name),
			new TypeReference(constructor)
		);
	}

	static useClass(constructor: ClassConstructor<any>, name?: ServiceName) {
		return Definition.useConstructor(constructor, name);
	}

	static useFactory(
		factory: (...args: any[]) => any | Promise<any>,
		options?: Definition.Options
	) {
		const { name, type } = resolveOptions(options);
		return new Definition(factories.fromFactory(factory), name, type);
	}

	static fromClassWithDecorator(clazz: ClassConstructor<any>) {
		return extractDefinitionFromClass(clazz);
	}

	setName(name: ServiceName): this {
		this.#assertNotLocked();
		this.#name = name;
		return this;
	}

	clone(name?: ServiceName) {
		const definition = new Definition(this.factory, name ?? this.name, this.finalType);

		if (this.arguments.length > 0) {
			definition.withArguments(...this.arguments);
		}
		if (this.annotations.length > 0) {
			definition.annotate(...this.annotations);
		}

		return definition;
	}

	setOwner(container: Container): this {
		this.#assertNotLocked();
		//tslint:disable-next-line: strict-comparisons
		if (this.owner && this.owner !== container) {
			throw ERRORS.OWNER_CANNOT_BE_CHANGED.create();
		}

		this.#owner = container;
		return this;
	}

	/**
	 * Sets the array of arguments provided to service factory.
	 * All arguments are provided directly to service constructor or
	 * factory unless they are an instance of ContainerArg which has to be resolved first
	 */
	withArguments(...args: unknown[]): this {
		this.#assertNotLocked();
		this.#arguments = args;
		return this;
	}

	/**
	 * Adds annotation to the service
	 * Annotation is a simple metadata object assigned to service that you might use for different purposes
	 */
	annotate(...annotations: unknown[]): this {
		this.#assertNotLocked();
		this.#annotations.push(...annotations);
		return this;
	}

	#assertNotLocked() {
		if (this.#isLocked) {
			throw ERRORS.DEFINITION_IS_LOCKED.create(this.name.toString());
		}
	}

	/**
	 * Locks definitions by making it immutable
	 */
	lock(): Readonly<this> {
		this.#isLocked = true;
		Object.freeze(this);
		return this;
	}

	/**
	 * Generates type reference for each argument that is a reference to another service by type
	 */
	*typeReferences(): Iterable<TypeReference> {
		for (const arg of this.#arguments) {
			if (arg instanceof ReferenceArgument) {
				if (arg.type === "one" && arg.lookup instanceof Lookup.ByType) {
					yield arg.lookup.typeReference;
				}
			}
		}
	}

	/**
	 * Creates new definition that is an alias for current one
	 */
	createAlias(options?: Definition.AliasOptions) {
		const def = Definition.useFactory(
			() => {
				if (!this.owner) {
					throw ERRORS.DEFINITION_WITHOUT_CONTAINER.create(def.name.toString());
				}
				return this.owner.resolve(this);
			},
			{
				name: options?.name ? options.name : this.name,
				type: this.#finalType,
			}
		);

		const annotations = (() => {
			const withAnnotations = options?.forwardAnnotations ?? false;
			if (is.func(withAnnotations)) {
				return this.annotations.filter(withAnnotations);
			}
			return withAnnotations ? this.annotations : [];
		})();

		if (annotations.length > 0) {
			def.annotate(...annotations);
		}
		return def;
	}
}

export namespace Definition {
	export interface AliasOptions {
		/**
		 * New definition ane
		 */
		name?: string;

		/**
		 * Forwards all annotations if true, none if false or the ones that satisfy given predicate
		 */
		forwardAnnotations?: boolean | ((annotation: unknown) => boolean);
	}

	export type Options = ServiceName | {};

	export namespace Options {
		export interface Shape {
			name?: ServiceName;
			type?: TypeReference | ClassConstructor<any>;
		}
	}
}
