import { ClassConstructor, ServiceFactory, ServiceName } from "./types";
import * as factories from "./serviceFactories";
import { TypeReference } from "./TypeReference";
import { Container } from "./Container";
import * as is from "predicates";
import { ERRORS } from "./errors";
import { randomName } from "./utils/randomName";
import { TypeCheck } from "@pallad/type-check";

const TYPE_CHECK = new TypeCheck<Definition>("@pallad/container/Definition");

export class Definition extends TYPE_CHECK.clazz {
	#arguments: unknown[] = [];
	#annotations: unknown[] = [];
	#factory!: ServiceFactory;
	readonly name: ServiceName;
	#finalType?: TypeReference;
	#owner?: Container;
	#isLocked = false;

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

	constructor(name?: ServiceName) {
		super();
		if (name) {
			this.name = name;
		} else {
			this.name = randomName();
		}
	}

	/**
	 * Sets service constructor
	 */
	useConstructor(constructor: ClassConstructor<any>): this {
		this.#assertNotLocked();
		this.#factory = factories.fromConstructor(constructor);
		this.#finalType = TypeReference.createFromClass(constructor);
		return this;
	}

	/**
	 * Alias for {@see useConstructor}
	 */
	useClass(clazz: { new (...args: any[]): any }) {
		this.#assertNotLocked();
		return this.useConstructor(clazz);
	}

	/**
	 * Sets factory used to create an instance of service.
	 * In case of asynchronous service creation, factory should return a promise.
	 *
	 * The factory value is called in context of AlphaDIC.
	 */
	useFactory(factory: (...args: any[]) => any | Promise<any>, type?: ClassConstructor<any>) {
		this.#assertNotLocked();
		this.#factory = factories.fromFactory(factory);
		this.#finalType = type && TypeReference.createFromClass(type);
		return this;
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
	 * Sets information about type of final service
	 */
	setFinalType(type: TypeReference | ClassConstructor<any>): this {
		this.#assertNotLocked();
		this.#finalType = TypeReference.is(type) ? type : TypeReference.createFromClass(type);
		return this;
	}

	/**
	 * Uses provided value as service
	 */
	useValue(value: any) {
		this.#assertNotLocked();
		this.#factory = factories.fromValue(value);
		this.#finalType = TypeReference.createFromValue(value);
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
	 * Creates new definition that is an alias for current one
	 */
	createAlias(options?: Definition.AliasOptions) {
		const def = new Definition(options?.name ? options.name : this.name).useFactory(() => {
			if (!this.owner) {
				throw ERRORS.DEFINITION_WITHOUT_CONTAINER.create(def.name.toString());
			}
			return this.owner.resolve(this);
		});

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
		if (this.#finalType) {
			def.setFinalType(this.#finalType);
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
}
