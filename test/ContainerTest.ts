import { Container } from "@src/Container";
import { Definition } from "@src/Definition";
import * as sinon from "sinon";
import { onMiddlewareAttach } from "@src/types";
import { TypeReference } from "@src/TypeReference";
import debug = require("debug");
import { ERRORS } from "@src/errors";
import "@pallad/errors-dev";
import { ContainerArgument } from "@src/arguments/ContainerArgument";
import { ReferenceArgument } from "@src/arguments/ReferenceArgument";
import { Service } from "@src/decorators/Service";

describe("Container", () => {
	let container: Container;
	let definitionA: Definition;
	let definitionB: Definition;

	const serviceA = { service: "A" };
	const serviceB = { service: "B" };

	const ANNOTATION = { name: "annotation1" };
	const ANNOTATION2 = { name: "annotation2" };

	beforeEach(() => {
		container = new Container();

		definitionA = Definition.useValue(serviceA, "A").annotate(ANNOTATION);

		definitionB = Definition.useValue(serviceB, "B").annotate(ANNOTATION2);
		container.registerDefinition(definitionA).registerDefinition(definitionB);
	});

	describe("defining services", () => {
		const NAME = "someServiceName";

		it("registering definition sets its owner", () => {
			const def = Definition.useValue("foo", NAME);
			expect(def.owner).toBeUndefined();
			container.registerDefinition(def);
			expect(def.owner).toStrictEqual(container);
		});

		it("registering definition", () => {
			const def = Definition.useValue("foo", NAME);
			container.registerDefinition(def);
			expect(container.findDefinitionByName(NAME)).toEqual(def);
		});

		it("register definition with the same name", () => {
			const def = Definition.useValue("foo", NAME);
			container.registerDefinition(def);

			expect(() => {
				container.registerDefinition(def);
			}).toThrowErrorWithCode(ERRORS.ALREADY_DEFINED);
		});
	});

	describe("finding", () => {
		it("by name", () => {
			expect(container.findDefinitionByName("A")).toEqual(definitionA);
		});

		it("by predicate", () => {
			expect(container.findDefinitionByPredicate(d => d.name === "B")).toEqual([definitionB]);
		});

		it("by annotation", () => {
			expect(
				container.findDefinitionByAnnotation(
					(a): a is typeof ANNOTATION => (a as any).name === ANNOTATION.name
				)
			).toEqual([[definitionA, ANNOTATION]]);
		});
	});

	describe("getting instances", () => {
		it("by name", () => {
			return expect(container.resolve("A")).resolves.toEqual(serviceA);
		});

		it("by predicate", () => {
			return expect(container.resolveByPredicate(d => d.name === "B")).resolves.toEqual([
				serviceB,
			]);
		});

		it("by annotation", () => {
			return expect(
				container.resolveByAnnotation(
					(a): a is typeof ANNOTATION => (a as any).name === ANNOTATION.name
				)
			).resolves.toEqual([[serviceA, ANNOTATION]]);
		});
	});

	describe("creating services", () => {
		it("definition factory is called only once and previously returned value is being returned all the time", async () => {
			const result = { foo: "bar" };
			const stub = sinon.stub().returns(result);

			const definition = Definition.useFactory(stub, "C");
			container.registerDefinition(definition);

			const p1 = container.resolve("C");
			const p2 = container.resolve("C");

			expect(p1).toEqual(p2);

			expect(await p1).toEqual(result);

			expect(await p2).toEqual(result);

			sinon.assert.calledOnce(stub);
		});

		it("definition factory is called with definition arguments", async () => {
			const result = { foo: "bar" };
			const stub = sinon.stub().returns(result);
			const args = [1, 2, 3, 4];

			container.registerDefinition(Definition.useFactory(stub, "C").withArguments(...args));

			expect(await container.resolve("C")).toEqual(result);

			sinon.assert.calledWithExactly(stub, ...args);
		});

		it("container args are resolved before providing to definition factory", async () => {
			const argValue = { foo: "value" };

			class DummyArg extends ContainerArgument<any> {
				resolve(): Promise<any> {
					return Promise.resolve(argValue);
				}

				*dependencies() {}
			}

			const arg = new DummyArg();

			const result = { foo: "bar" };
			const stub = sinon.stub().returns(result);

			container.registerDefinition(
				Definition.useFactory(stub, "C").withArguments(1, 2, arg, 4)
			);

			expect(await container.resolve("C")).toEqual(result);
			sinon.assert.calledWithExactly(stub, 1, 2, argValue, 4);
		});

		it("fails if definition contains circular reference", () => {
			container.findDefinitionByName("A")!.withArguments(ReferenceArgument.one.name("B"));

			container.findDefinitionByName("B")!.withArguments(ReferenceArgument.one.name("A"));

			return expect(container.resolve("A")).rejects.toThrowErrorWithCode(
				ERRORS.CIRCULAR_DEPENDENCY_DETECTED
			);
		});

		it("fails if definition dependency contains circular reference", () => {
			container.findDefinitionByName("A")!.withArguments(ReferenceArgument.one.name("B"));

			container.findDefinitionByName("B")!.withArguments(ReferenceArgument.one.name("C"));

			container.registerDefinition(
				Definition.useValue("foo", "C").withArguments(ReferenceArgument.one.name("B"))
			);

			return expect(container.resolve("A")).rejects.toThrowErrorWithCode(
				ERRORS.CIRCULAR_DEPENDENCY_DETECTED
			);
		});

		it("fails if service definition with given name does not exist", () => {
			return expect(container.resolve("foo")).rejects.toThrowErrorWithCode(
				ERRORS.SERVICE_NOT_FOUND
			);
		});

		describe("by type", () => {
			it("fails if service is not found", () => {
				@Service()
				class Foo {}

				return expect(container.resolveByClass(Foo)).rejects.toThrowErrorWithCode(
					ERRORS.SERVICE_NOT_FOUND
				);
			});

			it("fails if more than one service is found", () => {
				@Service()
				class Foo {}

				container
					.registerDefinition(Definition.fromClassWithDecorator(Foo))
					.registerDefinition(Definition.useConstructor(Foo, "foo"));

				return expect(container.resolveByClass(Foo)).rejects.toThrowErrorWithCode(
					ERRORS.AMBIGUOUS_SERVICE
				);
			});

			it("success if service is found", async () => {
				@Service()
				class Foo {}

				container.registerDefinition(Definition.fromClassWithDecorator(Foo));

				return expect(container.resolveByClass(Foo)).resolves.toBeInstanceOf(Foo);
			});

			it("still works even is class is not decorated with @Service", async () => {
				class Bar {}

				container.registerDefinition(Definition.useConstructor(Bar));

				return expect(container.resolveByClass(Bar)).resolves.toBeInstanceOf(Bar);
			});
		});
	});

	describe("middlewares", () => {
		it("call onMiddlewareAttached method once attached to container", () => {
			const hookStub = sinon.stub();
			const middleware = sinon.stub();
			(middleware as any)[onMiddlewareAttach] = hookStub;

			container.addMiddleware(middleware);
			sinon.assert.calledOnce(hookStub);
			sinon.assert.calledWith(hookStub, container);
		});

		it("are called one by one in order of registration to container", async () => {
			const middleware1 = sinon.stub().callsFake((d, next) => {
				return next(d);
			});

			const middleware2 = sinon.stub().callsFake((d, next) => {
				return next(d);
			});

			container.addMiddleware(middleware1, middleware2);

			expect(await container.resolve("A")).toEqual(serviceA);

			sinon.assert.calledWith(middleware1, container.findDefinitionByName("A"));
			sinon.assert.calledWith(middleware2, container.findDefinitionByName("A"));

			sinon.assert.callOrder(middleware1, middleware2);
		});

		it("if middleware returns non-thenable value then the value gets converted to promise", async () => {
			const result = { foo: "bar" };
			const middleware = sinon.stub().returns(result);

			container.addMiddleware(middleware);

			const service = container.resolve("A");

			expect(service).toBeInstanceOf(Promise);

			expect(await service).toEqual(result);
		});

		it("middleware can break the call chain preventing other middlewares to be called", async () => {
			const result = { foo: "bar" };
			const middleware1 = sinon.stub().returns(result);
			const middleware2 = sinon.stub().callsFake((d, next) => {
				return next(d);
			});

			container.addMiddleware(middleware1, middleware2);

			expect(await container.resolve("A")).toEqual(result);

			sinon.assert.calledWith(middleware1, container.findDefinitionByName("A"));
			sinon.assert.notCalled(middleware2);
		});

		it("middleware can override definition provided to other middlewares", async () => {
			const result = { foo: "bar" };
			const definition = Definition.useValue(result, "C");

			const middleware1 = sinon.stub().callsFake((d, next) => {
				return next(definition);
			});

			const middleware2 = sinon.stub().callsFake((d, next) => {
				return next(d);
			});

			container.addMiddleware(middleware1, middleware2);

			expect(await container.resolve("A")).toEqual(result);

			sinon.assert.calledWith(middleware1, container.findDefinitionByName("A"));
			sinon.assert.calledWith(middleware2, definition);

			sinon.assert.callOrder(middleware1, middleware2);
		});
	});

	describe("Hierarchical", () => {
		let parentContainer: Container;
		let definitionA: Definition;
		let definitionB: Definition;
		beforeEach(() => {
			parentContainer = new Container();
			container = new Container(parentContainer);

			definitionA = Definition.useValue(serviceA, "A").annotate(ANNOTATION);
			parentContainer.registerDefinition(definitionA);

			definitionB = Definition.useValue(serviceB, "B").annotate(ANNOTATION2);
			container.registerDefinition(definitionB);
		});

		describe("middlewares", () => {
			let middleware: sinon.SinonStub;
			beforeEach(() => {
				middleware = sinon.stub();
			});

			it("registering child middleware does not affect parent", () => {
				container.addMiddleware(middleware);

				expect(container.middlewares).toEqual([middleware]);

				expect(parentContainer.middlewares).toEqual([]);
			});

			it("middleware in parent and child", () => {
				const middleware2 = sinon.stub();
				parentContainer.addMiddleware(middleware);
				container.addMiddleware(middleware2);

				expect(container.middlewares).toEqual([middleware2]);

				expect(parentContainer.middlewares).toEqual([middleware]);
			});
		});

		describe("finding by name", () => {
			it("from parent container", () => {
				expect(container.findDefinitionByName("A")).toStrictEqual(definitionA);
			});

			it("from current container", () => {
				expect(container.findDefinitionByName("B")).toStrictEqual(definitionB);
			});

			it("definition from child container does not exist in parent container", () => {
				expect(parentContainer.findDefinitionByName("B")).toBeUndefined();
			});
		});

		describe("finding by predicate", () => {
			it("returns all services for true predicate", () => {
				expect(container.findDefinitionByPredicate(x => true)).toEqual([
					definitionB,
					definitionA,
				]);
			});

			it("returns services that satisfies predicate", () => {
				expect(container.findDefinitionByPredicate(s => s.name === "A")).toEqual([
					definitionA,
				]);
			});
		});

		describe("finding by annotation predicate", () => {
			it("returns all services for true predicate", () => {
				expect(container.findDefinitionByAnnotation((ann): ann is any => true)).toEqual([
					[definitionB, ANNOTATION2],
					[definitionA, ANNOTATION],
				]);
			});

			it("returns services that match predicate", () => {
				//tslint:disable-next-line: strict-comparisons
				expect(
					container.findDefinitionByAnnotation(
						(a): a is typeof ANNOTATION => a === ANNOTATION
					)
				).toEqual([[definitionA, ANNOTATION]]);

				//tslint:disable-next-line: strict-comparisons
				expect(
					container.findDefinitionByAnnotation(
						(a): a is typeof ANNOTATION => a === ANNOTATION2
					)
				).toEqual([[definitionB, ANNOTATION2]]);
			});

			it("child containers are ignored when looking in parent container", () => {
				expect(
					parentContainer.findDefinitionByAnnotation((ann): ann is any => true)
				).toEqual([[definitionA, { name: "annotation1" }]]);
			});
		});

		describe("getting instance from parent", () => {
			it("does not cache result in current container", async () => {
				const serviceX = {};
				const factory = sinon.stub().returns(serviceX);

				parentContainer.registerDefinition(Definition.useFactory(factory, "X"));

				const containerA = new Container(parentContainer);
				const containerB = new Container(parentContainer);

				expect(await containerA.resolve("X")).toEqual(serviceX);

				expect(await containerB.resolve("X")).toEqual(serviceX);

				sinon.assert.calledOnce(factory);
			});
		});
	});

	describe("slow log", () => {
		let logs: string[] = [];
		let container: Container;

		beforeEach(() => {
			logs = [];
			container = new Container();
			debug.enable("@pallad/container:slow-creation");
			sinon.stub(debug, "log").callsFake(message => logs.push(message));
		});

		afterEach(() => {
			logs = [];
			debug.disable();
			(debug.log as sinon.SinonStub).restore();
		});

		it("success", async () => {
			container.slowLogThreshold = 100;
			const d = Definition.useFactory(() => {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(undefined);
					}, 200);
				});
			});
			container.registerDefinition(d);

			await container.resolve(d);
			expect(logs[0]).toEqual(expect.stringMatching(/long time to create/));
		});

		it("disabling", async () => {
			container.slowLogThreshold = 0;

			const d = Definition.useFactory(() => {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(undefined);
					}, 150);
				});
			});
			container.registerDefinition(d);

			await container.resolve(d);
			expect(logs).toHaveLength(0);
		});

		it("custom threshold", async () => {
			container.slowLogThreshold = 500;

			const d = Definition.useFactory(() => {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(undefined);
					}, 550);
				});
			});
			container.registerDefinition(d);

			await container.resolve(d);
			expect(logs[0]).toEqual(expect.stringMatching(/long time to create/));
		});
	});

	describe("auto definition of related services", () => {
		it("defining A that is using B also registers B definition", () => {
			@Service()
			class B {}

			@Service()
			class A {
				constructor(private b: B) {}
			}

			container.registerDefinition(Definition.fromClassWithDecorator(A));

			const [definition] = container.findDefinitionByClass(B);
			expect(definition).toBeInstanceOf(Definition);
			return expect(container.resolveByClass(A)).resolves.toBeInstanceOf(A);
		});

		it("skips classes with @Service decorator", () => {
			class B {}

			@Service()
			class A {
				constructor(private b: B) {}
			}

			container.registerDefinition(Definition.fromClassWithDecorator(A));
			const definitions = container.findDefinitionByClass(B);
			expect(definitions).toHaveLength(0);
			container.registerDefinition(Definition.useClass(B));
			return expect(container.resolveByClass(A)).resolves.toBeInstanceOf(A);
		});

		
		it("defining A that is using B but B is already registered", () => {
			@Service()
			class B {}

			@Service()
			class A {
				constructor(private b: B) {}
			}

			container
				.registerDefinition(Definition.fromClassWithDecorator(B))
				.registerDefinition(Definition.fromClassWithDecorator(A));

			const [definition] = container.findDefinitionByClass(B);
			expect(definition).toBeInstanceOf(Definition);
			return expect(container.resolveByClass(A)).resolves.toBeInstanceOf(A);
		});

		it("defining A that is using B but B is already registered in parent container", () => {
			const parentContainer = new Container();
			const container = new Container(parentContainer);

			@Service()
			class B {}

			@Service()
			class A {
				constructor(private b: B) {}
			}

			parentContainer.registerDefinition(Definition.fromClassWithDecorator(B));
			container.registerDefinition(Definition.fromClassWithDecorator(A));

			const [definition] = container.findDefinitionByClass(B);
			expect(definition).toBeInstanceOf(Definition);
			return expect(container.resolveByClass(A)).resolves.toBeInstanceOf(A);
		});

		it("4 levels deep", () => {
			@Service()
			class A {}

			@Service()
			class B {
				constructor(private a: A) {}
			}

			@Service()
			class C {
				constructor(private b: B) {}
			}

			@Service()
			class D {
				constructor(private c: C) {}
			}

			container.registerDefinition(Definition.fromClassWithDecorator(D));

			return expect(container.resolveByClass(D)).resolves.toBeInstanceOf(D);
		});

		it("defining A and B that are using the same C should register C only once", async () => {
			@Service()
			class C {}

			@Service()
			class A {
				constructor(private c: C) {}
			}

			@Service()
			class B {
				constructor(private c: C) {}
			}

			container.registerDefinition(Definition.fromClassWithDecorator(A));
			container.registerDefinition(Definition.fromClassWithDecorator(B));

			await expect(container.resolveByClass(A)).resolves.toBeInstanceOf(A);
			await expect(container.resolveByClass(B)).resolves.toBeInstanceOf(B);
		});

		it("registering many classes with auto definition should be roughly O(n) complex", () => {
			const container = new Container();
			const timeStart = new Date();
			for (let i = 0; i < 1000; i++) {
				@Service(`A1${i}`)
				class A1 {}

				@Service(`A2${i}`)
				class A2 {
					constructor(private a: A1) {}
				}

				@Service(`A3${i}`)
				class A3 {
					constructor(private a: A2) {}
				}

				@Service(`B${i}`)
				class B {
					constructor(private a: A3) {}
				}

				container.registerDefinition(Definition.fromClassWithDecorator(B));
			}
			const timeDiff = new Date().getTime() - timeStart.getTime();

			expect(timeDiff).toBeLessThan(100);
			expect(container.findDefinitionByPredicate(() => true)).toHaveLength(4000);
		});
	});

	describe("aliasing", () => {
		it("success", () => {
			const service = { service: "value" };
			const container = new Container();
			const container2 = new Container();
			const definition = Definition.useValue(service);
			container.registerDefinition(definition);

			const newDef = container2.alias(definition);

			expect(newDef).toBeInstanceOf(Definition);

			return expect(container2.resolve(newDef.name)).resolves.toStrictEqual(service);
		});
	});

	describe("loading definitions from iterable", () => {
		it("iterable of definitions", () => {
			const def1 = Definition.useValue("foo", "A1");
			const def2 = Definition.useValue("bar", "B1");

			container.loadDefinitionsFromIterable([def1, def2]);

			expect(container.findDefinitionByName("A1")).toStrictEqual(def1);
			expect(container.findDefinitionByName("B1")).toStrictEqual(def2);
		});

		it("iterable of classes", () => {
			@Service("A1")
			class A {}

			@Service("B1")
			class B {}

			container.loadDefinitionsFromIterable([A, B]);

			expect(container.findDefinitionByClass(A)).toHaveLength(1);
			expect(container.findDefinitionByClass(B)).toHaveLength(1);
		});

		it("fails for invalid values in iterable", () => {
			expect(() => {
				container.loadDefinitionsFromIterable([1 as any]);
			}).toThrowErrorWithCode(ERRORS.INVALID_DEFINITION_OR_CLASS);
		});
	});
});
