import {
	AnnotationPredicate,
	ServiceName,
	DefinitionPredicate,
	Middleware,
	ServiceFactory,
	onMiddlewareAttach,
	ClassConstructor,
} from "./types";
import { Definition } from "./Definition";
import { assertNoCircularDependencies } from "./assertNoCircularDependencies";
import * as is from "predicates";
import { debugFn } from "./debugFn";
import { ERRORS } from "./errors";
import { randomName } from "./utils/randomName";
import { extractDefinitionFromClass } from "./classServiceMetadata";
import { ContainerArgument } from "./arguments/ContainerArgument";
import { TypeReference } from "./TypeReference";

const debugCreation = debugFn("creation");
const debugDefinition = debugFn("definition");
const debugSlowCreation = debugFn("slow-creation");

export class Container {
	#definitions: Map<string | Symbol, Definition> = new Map();
	#services: Map<Definition, Promise<any>> = new Map();
	#middlewares: Middleware[] = [];

	public readonly parent?: Container;

	/**
	 * Time needed to trigger debug slow creation log
	 */
	public slowLogThreshold: number = 10000;

	get middlewares() {
		return this.#middlewares.slice();
	}

	constructor(parent?: Container) {
		Object.defineProperty(this, "parent", {
			value: parent,
			writable: false,
		});
	}

	/**
	 * Registers given service definition
	 */
	registerDefinition(definition: Definition): this {
		if (this.#definitions.has(definition.name)) {
			throw ERRORS.ALREADY_DEFINED.create(definition.name.toString());
		}
		debugDefinition(`Service ${definition.name.toString()} defined`);
		definition.setOwner(this);
		this.#definitions.set(definition.name, definition);
		return this;
	}

	/**
	 * Creates and registers service definition
	 *
	 * Returns created definition for further configuration
	 */
	definition(name?: ServiceName) {
		const definition = new Definition(name);
		this.registerDefinition(definition);
		return definition;
	}

	definitionFromClass(clazz: ClassConstructor<any>) {
		this.registerDefinition(extractDefinitionFromClass(clazz));
		return this;
	}

	/**
	 * Loads definitions to container from iterable that might contain Definition objects or class references
	 */
	loadDefinitionsFromIterable(iterable: Iterable<Definition | ClassConstructor<any>>) {
		for (const definitionOrClass of iterable) {
			if (Definition.isType(definitionOrClass)) {
				this.registerDefinition(definitionOrClass);
			} else if (is.func(definitionOrClass)) {
				this.registerDefinition(extractDefinitionFromClass(definitionOrClass));
			}
		}
		return this;
	}

	/**
	 * Creates and registers service definition with given name, function as constructor
	 */
	definitionWithConstructor(name: ServiceName, clazz: ClassConstructor<any>): Definition;
	definitionWithConstructor(clazz: ClassConstructor<any>): Definition;
	definitionWithConstructor(
		nameOrClazz: ServiceName | ClassConstructor<any>,
		clazz?: ClassConstructor<any>
	) {
		const finalClazz = is.func(nameOrClazz) ? nameOrClazz : clazz!;
		return this.definition(
			ServiceName.is(nameOrClazz) ? nameOrClazz : randomName(finalClazz.name)
		).useConstructor(finalClazz);
	}

	/**
	 * Creates and registers service definition with given name, function as factory
	 */
	definitionWithFactory(name: ServiceName, factory: ServiceFactory, type?: Function): Definition;
	definitionWithFactory(factory: ServiceFactory, type?: Function): Definition;
	definitionWithFactory(
		nameOrFactory: ServiceName | ServiceFactory,
		factoryOrType: ServiceFactory | { new (...args: any[]): any },
		type?: { new (...args: any[]): any }
	): Definition {
		const name = ServiceName.is(nameOrFactory) ? nameOrFactory : undefined;
		const factory = is.func(nameOrFactory)
			? (nameOrFactory as ServiceFactory)
			: (factoryOrType as ServiceFactory);
		const finalType = is.func(nameOrFactory)
			? (factoryOrType as { new (...args: any[]): any })
			: type;

		const def = this.definition(name).useFactory(factory);
		if (finalType) {
			def.setFinalType(finalType);
		}
		return def;
	}

	/**
	 * Creates and registers service definition with given name and value as a service
	 */
	definitionWithValue(name: ServiceName, value: any): Definition;
	definitionWithValue(value: any): Definition;
	definitionWithValue(nameOrValue: ServiceName | any, value?: any): Definition {
		const isNameProvided = value !== undefined && ServiceName.is(nameOrValue);
		const finalValue = isNameProvided ? value : nameOrValue;
		const name = isNameProvided
			? nameOrValue
			: randomName(Object.getPrototypeOf(finalValue).constructor.name);
		return this.definition(name).useValue(finalValue);
	}

	/**
	 * Returns definition by given name
	 */
	findDefinitionByName(name: ServiceName): Definition | undefined {
		if (this.#definitions.has(name)) {
			return this.#definitions.get(name);
		}

		if (this.parent) {
			return this.parent.findDefinitionByName(name);
		}
	}

	/**
	 * Returns definitions that satisfy given predicate
	 */
	findDefinitionByPredicate(predicate: DefinitionPredicate): Definition[] {
		return Array.from(this.#definitions.values())
			.filter(predicate)
			.concat(this.parent ? this.parent.findDefinitionByPredicate(predicate) : []);
	}

	/**
	 * Returns all definitions that contain annotation that satisfied by given predicate
	 */
	findDefinitionByAnnotation<T>(predicate: AnnotationPredicate<T>): Array<[Definition, T]> {
		let annotations: any[] = [];
		const definitions = this.findDefinitionByPredicate(s => {
			const annotation = s.annotations.find(predicate);

			if (annotation) {
				annotations.push(annotation);
				return true;
			}
			return false;
		});

		return definitions.map((d): [Definition, any] => {
			return [d, annotations.shift()];
		});
	}

	findDefinitionByClass<T>(type: ClassConstructor<T>): Array<Definition> {
		const typeReference = new TypeReference(type);
		return this.findDefinitionByPredicate(typeReference.predicate);
	}

	/**
	 * Registers given middleware
	 */
	addMiddleware(...middlewares: Middleware[]): Container {
		for (const middleware of middlewares) {
			if (middleware[onMiddlewareAttach]) {
				middleware[onMiddlewareAttach]!(this);
			}
		}
		this.#middlewares.push(...middlewares);
		return this;
	}

	/**
	 * Returns service for given name or definition
	 */
	resolve<T>(nameOrDefinition: ServiceName | Definition): Promise<T> {
		let definition: Definition | undefined;

		if (ServiceName.is(nameOrDefinition)) {
			definition = this.findDefinitionByName(nameOrDefinition);
			if (definition === undefined) {
				return Promise.reject(ERRORS.SERVICE_NOT_FOUND.create(nameOrDefinition.toString()));
			}
		} else {
			definition = nameOrDefinition;
		}

		if (this.#services.has(definition)) {
			return this.#services.get(definition)!;
		}

		if (!this.#definitions.has(definition.name) && this.parent) {
			return this.parent.resolve(definition);
		}

		const promise = this.create(definition);
		this.#services.set(definition, promise);
		return promise;
	}

	private async create(definition: Definition) {
		if (!definition.factory) {
			return Promise.reject(
				ERRORS.INCOMPLETE_DEFINITION.create(
					`Missing factory for service definition "${definition.name.toString()}". Define it as constructor, factory or value`
				)
			);
		}

		assertNoCircularDependencies(this, definition);

		// valid definition, time to lock it
		definition.lock();

		let timeout: any;
		if (this.slowLogThreshold > 0) {
			timeout = setTimeout(() => {
				debugSlowCreation(
					`Service ${definition.name.toString()} takes a long time to create. Over ${this.slowLogThreshold} ms`
				);
			}, this.slowLogThreshold);
		}

		const debugMsg = `Creating service ${definition.name.toString()}`;
		debugCreation(`${debugMsg} - started`);
		let currentMiddleware = 0;
		const middlewares = this.#middlewares.slice();
		const next = (definition: Definition) => {
			const middleware = middlewares[currentMiddleware];
			currentMiddleware++;
			if (middleware) {
				return middleware.call(this, definition, next);
			}

			return Promise.all(
				definition.arguments.map(a => (ContainerArgument.isType(a) ? a.resolve(this) : a))
			).then((args: any[]) => definition.factory.apply(this, args));
		};

		try {
			const result = await next.call(this, definition);
			timeout && clearTimeout(timeout);
			debugCreation(`${debugMsg} - finished`);
			return result;
		} catch (e) {
			timeout && clearTimeout(timeout);
			throw e;
		}
	}

	/**
	 * Returns all services that definition satisfies predicate
	 */
	resolveByPredicate<T>(predicate: DefinitionPredicate): Promise<T[]> {
		return Promise.all(this.findDefinitionByPredicate(predicate).map(d => this.resolve<T>(d)));
	}

	/**
	 * Returns all services that definition contains annotation satisfied by given predicate
	 */
	resolveByAnnotation<T, TAnnotation>(
		predicate: AnnotationPredicate<TAnnotation>
	): Promise<Array<[T, TAnnotation]>> {
		return Promise.all(
			this.findDefinitionByAnnotation(predicate).map(async ([definition, annotation]) => {
				return [await this.resolve(definition), annotation] as const;
			})
		) as Promise<Array<[T, TAnnotation]>>;
	}

	resolveByClass<T>(type: ClassConstructor<T>): Promise<T> {
		const definitions = this.findDefinitionByClass<T>(type);
		if (definitions.length === 0) {
			return Promise.reject(
				ERRORS.SERVICE_NOT_FOUND.create(`Service for class "${type.name}" not found`)
			);
		}

		if (definitions.length > 1) {
			return Promise.reject(
				ERRORS.AMBIGUOUS_SERVICE.create(
					definitions.map(d => d.name.toString()),
					`Class "${type.name}"`
				)
			);
		}
		return this.resolve<T>(definitions[0]);
	}

	alias(definition: Definition, options?: Definition.AliasOptions) {
		const newDefinition = definition.createAlias(options);
		this.registerDefinition(newDefinition);
		return newDefinition;
	}
}
