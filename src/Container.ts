import {
	AnnotationPredicate,
	ServiceName,
	DefinitionPredicate,
	Middleware,
	ServiceFactory,
	onMiddlewareAttach,
} from "./types";
import { Definition } from "./Definition";
import { assertNoCircularDependencies } from "./assertNoCircularDependencies";
import { ContainerArg } from "./args/ContainerArg";
import * as is from "predicates";
import { debugFn } from "./debugFn";
import { ERRORS } from "./errors";
import { randomName } from "./utils/randomName";

const debugCreation = debugFn("creation");
const debugDefinition = debugFn("definition");
const debugSlowCreation = debugFn("slow-creation");

export class Container {
	private definitions: Map<string | Symbol, Definition> = new Map();
	private services: Map<Definition, Promise<any>> = new Map();
	private middlewares: Middleware[] = [];

	public readonly parent?: Container;

	/**
	 * Time needed to trigger debug slow creation log
	 */
	public slowLogThreshold: number = 10000;

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
		if (this.definitions.has(definition.name)) {
			throw ERRORS.ALREADY_DEFINED.create(definition.name.toString());
		}
		debugDefinition(`Service ${definition.name.toString()} defined`);
		definition.setOwner(this);
		this.definitions.set(definition.name, definition);
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

	loadFromIterable(iterable: Iterable<Definition | {new (...args: any[]): any}) {
		for (const definitionOrClass of iterable) {
			if (Definition.i
		}
	}

	/**
	 * Creates and registers service definition with given name, function as constructor
	 */
	definitionWithConstructor(name: ServiceName, clazz: { new (...args: any[]): any }): Definition;
	definitionWithConstructor(clazz: { new (...args: any[]): any }): Definition;
	definitionWithConstructor(
		nameOrClazz: ServiceName | { new (...args: any[]): any },
		clazz?: { new (...args: any[]): any }
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
		factoryOrType: ServiceFactory | Function,
		type?: Function
	): Definition {
		const name = ServiceName.is(nameOrFactory) ? nameOrFactory : undefined;
		const factory = is.func(nameOrFactory)
			? (nameOrFactory as ServiceFactory)
			: (factoryOrType as ServiceFactory);
		const finalType = is.func(nameOrFactory) ? factoryOrType : type;

		const def = this.definition(name).useFactory(factory);
		if (finalType) {
			def.markType(finalType);
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
		if (this.definitions.has(name)) {
			return this.definitions.get(name);
		}

		if (this.parent) {
			return this.parent.findDefinitionByName(name);
		}
	}

	/**
	 * Returns definitions that satisfy given predicate
	 */
	findDefinitionByPredicate(predicate: DefinitionPredicate): Definition[] {
		return Array.from(this.definitions.values())
			.filter(predicate)
			.concat(this.parent ? this.parent.findDefinitionByPredicate(predicate) : []);
	}

	/**
	 * Returns all definitions that contain annotation that satisfied given predicate
	 */
	findDefinitionByAnnotation(predicate: AnnotationPredicate): Definition[];
	findDefinitionByAnnotation(predicate: AnnotationPredicate, withAnnotation: false): Definition[];
	findDefinitionByAnnotation(
		predicate: AnnotationPredicate,
		withAnnotation: true
	): Array<[Definition, any]>;
	findDefinitionByAnnotation(
		predicate: AnnotationPredicate,
		withAnnotation: boolean = false
	): Definition[] | Array<[Definition, any]> {
		let annotations: any[] = [];
		const definitions = this.findDefinitionByPredicate(s => {
			const annotation = s.annotations.find(predicate);

			if (annotation) {
				withAnnotation && annotations.push(annotation);
				return true;
			}
			return false;
		});

		if (withAnnotation) {
			return definitions.map((d): [Definition, any] => {
				return [d, annotations.shift()];
			});
		}
		return definitions;
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
		this.middlewares.push(...middlewares);
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

		if (this.services.has(definition)) {
			return this.services.get(definition)!;
		}

		if (!this.definitions.has(definition.name) && this.parent) {
			return this.parent.resolve(definition);
		}

		const promise = this.create(definition);
		this.services.set(definition, promise);
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
		const middlewares = this.middlewares.slice();
		const next = (definition: Definition) => {
			const middleware = middlewares[currentMiddleware];
			currentMiddleware++;
			if (middleware) {
				return middleware.call(this, definition, next);
			}

			return Promise.all(
				definition.args.map(a => (ContainerArg.is(a) ? a.getArgument(this) : a))
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
	resolveByAnnotation<T = any>(predicate: AnnotationPredicate): Promise<T[]>;
	resolveByAnnotation<T = any>(
		predicate: AnnotationPredicate,
		withAnnotation: false
	): Promise<T[]>;
	resolveByAnnotation<T = any, TAnnotation = any>(
		predicate: AnnotationPredicate,
		withAnnotation: true
	): Promise<Array<[T, TAnnotation]>>;
	resolveByAnnotation<T = any, TAnnotation = any>(
		predicate: AnnotationPredicate,
		withAnnotation: boolean = false
	): Promise<T[] | Array<[T, TAnnotation]>> {
		return Promise.all(
			this.findDefinitionByAnnotation(predicate, true).map(
				async ([definition, annotation]) => {
					if (withAnnotation) {
						return [await this.resolve(definition), annotation] as const;
					}
					return this.resolve(definition);
				}
			)
		) as Promise<T[] | Array<[T, TAnnotation]>>;
	}

	alias(definition: Definition, options?: Definition.AliasOptions) {
		const newDefinition = definition.createAlias(options);
		this.registerDefinition(newDefinition);
		return newDefinition;
	}
}
