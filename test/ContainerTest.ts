import { Container } from "@src/Container";
import { Definition } from "@src/Definition";
import * as sinon from "sinon";
import { ContainerArg } from "@src/args/ContainerArg";
import { ReferenceArg } from "@src/args/ReferenceArg";
import { onMiddlewareAttach } from "@src/types";
import { TypeRef } from "@src/TypeRef";
import debug = require("debug");
import { create } from "@src/index";
import { ERRORS } from "@src/errors";
import "@pallad/errors-dev";

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

		definitionA = container.definition("A").useValue(serviceA).annotate(ANNOTATION);

		definitionB = container.definition("B").useValue(serviceB).annotate(ANNOTATION2);
	});

	describe("defining services", () => {
		const NAME = "someServiceName";

		it("registering definition sets its owner", () => {
			const def = new Definition(NAME);
			expect(def.owner).toBeUndefined();
			container.registerDefinition(def);
			expect(def.owner).toStrictEqual(container);
		});

		it("registering definition", () => {
			const def = new Definition(NAME);
			container.registerDefinition(def);
			expect(container.findDefinitionByName(NAME)).toEqual(def);
		});

		it("register definition with the same name", () => {
			const def = new Definition(NAME);
			container.registerDefinition(def);

			expect(() => {
				container.registerDefinition(def);
			}).toThrowErrorWithCode(ERRORS.ALREADY_DEFINED);
		});

		it("creating with registration", () => {
			const def = container.definition(NAME);
			expect(container.findDefinitionByName(NAME)).toEqual(def);
		});

		it("(as constructor) with registration", () => {
			class Test {
				public readonly args: any[];

				constructor(...args: any[]) {
					this.args = args;
				}
			}

			const definition = container.definitionWithConstructor(NAME, Test);

			expect(container.findDefinitionByName(NAME)).toEqual(definition);
			expect(definition.factory(1, 2)).toEqual(new Test(1, 2));
		});

		it("(as constructor) with registration without name", () => {
			class Test {
				public readonly args: any[];

				constructor(...args: any[]) {
					this.args = args;
				}
			}

			const definition = container.definitionWithConstructor(Test);
			expect(definition.name).toMatch(/^Test.*/);

			expect(definition.factory(1, 2)).toEqual(new Test(1, 2));
		});

		it("creating (as factory) with registration", () => {
			const factoryResult = { foo: "bar" };
			const factory = sinon.stub().returns(factoryResult);

			const definition = container.definitionWithFactory(NAME, factory);
			expect(container.findDefinitionByName(NAME)).toStrictEqual(definition);

			expect(definition.factory(1, 2, 3)).toEqual(factoryResult);

			sinon.assert.calledWithExactly(factory, 1, 2, 3);
		});

		it("creating (as factory) with registration without name", () => {
			class Foo {}

			const factoryResult = new Foo();
			const factory = sinon.stub().returns(factoryResult);

			const definition = container.definitionWithFactory(factory, Foo);
			expect(container.findDefinitionByName(definition.name)).toEqual(definition);

			expect(definition.type).toEqual(TypeRef.createFromType(Foo));

			expect(definition.factory(1, 2, 3)).toEqual(factoryResult);
			sinon.assert.calledWithExactly(factory, 1, 2, 3);
		});

		it("creating (as value) with registration with global type", () => {
			const val = { foo: "bar" };
			const definition = container.definitionWithValue(NAME, val);
			expect(container.findDefinitionByName(NAME)).toStrictEqual(definition);

			expect(definition.factory()).toStrictEqual(val);

			expect(definition.type).toBeUndefined();
		});

		it("creating (as value) with registration with class type", () => {
			class Foo {}

			const val = new Foo();

			const definition = container.definitionWithValue(NAME, val);
			expect(container.findDefinitionByName(NAME)).toStrictEqual(definition);

			expect(definition.factory()).toStrictEqual(val);

			expect(definition.type).toEqual(TypeRef.createFromType(Foo));
		});

		it("creating (as value) without name", () => {
			class Foo {}

			const val = new Foo();
			const definition = container.definitionWithValue(val);
			expect(container.findDefinitionByName(definition.name)).toStrictEqual(definition);

			expect(definition.name).toMatch(/^Foo.*/);

			expect(definition.factory()).toStrictEqual(val);

			expect(definition.type).toEqual(TypeRef.createFromType(Foo));
		});
	});

	describe("finding", () => {
		it("by name", () => {
			expect(container.findDefinitionByName("A")).toEqual(definitionA);
		});

		it("by predicate", () => {
			expect(container.findDefinitionByPredicate(d => d.name === "B")).toEqual([definitionB]);
		});

		describe("by annotation", () => {
			it("by some predicate", () => {
				expect(container.findDefinitionByAnnotation(a => a.name === ANNOTATION.name)).toEqual([
					definitionA,
				]);
			});

			it("with annotation", () => {
				expect(container.findDefinitionByAnnotation(() => true, true)).toEqual([
					[definitionA, ANNOTATION],
					[definitionB, ANNOTATION2],
				]);
			});

			it("without annotation", () => {
				expect(container.findDefinitionByAnnotation(() => true, false)).toEqual([
					definitionA,
					definitionB,
				]);
			});
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
				container.resolveByAnnotation(a => a.name === ANNOTATION.name)
			).resolves.toEqual([serviceA]);
		});

		it("by annotation with annotation", () => {
			return expect(container.resolveByAnnotation(() => true, true)).resolves.toEqual([
				[serviceA, ANNOTATION],
				[serviceB, ANNOTATION2],
			]);
		});

		it("by annotation without annotation", async () => {
			return expect(container.resolveByAnnotation(() => true, false)).resolves.toEqual([
				serviceA,
				serviceB,
			]);
		});
	});

	describe("creating services", () => {
		it("definition factory is called only once and previously returned value is being returned all the time", async () => {
			const result = { foo: "bar" };
			const stub = sinon.stub().returns(result);

			container.definition("C").useFactory(stub);

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

			container
				.definition("C")
				.useFactory(stub)
				.withArgs(...args);

			expect(await container.resolve("C")).toEqual(result);

			sinon.assert.calledWithExactly(stub, ...args);
		});

		it("container args are resolved before providing to definition factory", async () => {
			class DummyArg extends ContainerArg {
				getArgument(container: Container): Promise<any> {
					return Promise.resolve(undefined);
				}

				getDependentServices(container: Container): Definition | Definition[] {
					return [];
				}
			}

			const arg = sinon.createStubInstance(DummyArg);
			const argValue = { foo: "value" };

			arg.getArgument.withArgs(container).resolves(argValue);

			const result = { foo: "bar" };
			const stub = sinon.stub().returns(result);

			container.definition("C").useFactory(stub).withArgs(1, 2, arg, 4);

			expect(await container.resolve("C")).toEqual(result);
			sinon.assert.calledWithExactly(stub, 1, 2, argValue, 4);
		});

		it("fails if definition contains circular reference", () => {
			container.findDefinitionByName("A")!.withArgs(ReferenceArg.one.name("B"));

			container.findDefinitionByName("B")!.withArgs(ReferenceArg.one.name("A"));

			return expect(container.resolve("A")).rejects.toThrowError(
				/Circular dependency found: A \-> B \-> A/
			);
		});

		it("fails if definition dependency contains circular reference", () => {
			container.findDefinitionByName("A")!.withArgs(ReferenceArg.one.name("B"));

			container.findDefinitionByName("B")!.withArgs(ReferenceArg.one.name("C"));

			container.definition("C").useValue("foo").withArgs(ReferenceArg.one.name("B"));

			return expect(container.resolve("A")).rejects.toThrowError(
				/Circular dependency found: A \-> B \-> C \-> B/
			);
		});

		it("fails if service definition with given name does not exist", () => {
			return expect(container.resolve("foo")).rejects.toThrowError(
				/Service "foo" does not exist/
			);
		});

		it("fails if definition is incomplete", () => {
			container.definition("C");

			return expect(container.resolve("C")).rejects.toThrowError(
				/Missing factory for service definition "C"/
			);
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
			const definition = new Definition("C").useValue(result);

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

			definitionA = parentContainer.definition("A").useValue(serviceA).annotate(ANNOTATION);

			definitionB = container.definition("B").useValue(serviceB).annotate(ANNOTATION2);
		});

		describe("middlewares", () => {
			let middleware: sinon.SinonStub;
			beforeEach(() => {
				middleware = sinon.stub();
			});

			it("registering child middleware does not affect parent", () => {
				container.addMiddleware(middleware);

				expect(container.getMiddlewares()).toEqual([middleware]);

				expect(parentContainer.getMiddlewares()).toEqual([]);
			});

			it("middleware in parent and child", () => {
				const middleware2 = sinon.stub();
				parentContainer.addMiddleware(middleware);
				container.addMiddleware(middleware2);

				expect(container.getMiddlewares()).toEqual([middleware2]);

				expect(parentContainer.getMiddlewares()).toEqual([middleware]);
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
				expect(container.findDefinitionByPredicate(x => true)).toEqual([definitionB, definitionA]);
			});

			it("returns services that satisfies predicate", () => {
				expect(container.findDefinitionByPredicate(s => s.name === "A")).toEqual([definitionA]);
			});
		});

		describe("finding by annotation predicate", () => {
			it("returns all services for true predicate", () => {
				expect(container.findDefinitionByAnnotation(() => true)).toEqual([definitionB, definitionA]);
			});

			it("returns services that match predicate", () => {
				//tslint:disable-next-line: strict-comparisons
				expect(container.findDefinitionByAnnotation(a => a === ANNOTATION)).toEqual([definitionA]);

				//tslint:disable-next-line: strict-comparisons
				expect(container.findDefinitionByAnnotation(a => a === ANNOTATION2)).toEqual([definitionB]);
			});

			it("child containers are ignored when looking in parent container", () => {
				expect(parentContainer.findDefinitionByAnnotation(() => true)).toEqual([definitionA]);
			});
		});

		describe("getting instance from parent", () => {
			it("does not cache result in current container", async () => {
				const serviceX = {};
				const factory = sinon.stub().returns(serviceX);

				parentContainer.definition("X").useFactory(factory);

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
			debug.enable("alpha-dic:slow-creation");
			sinon.stub(debug, "log").callsFake(message => logs.push(message));
		});

		afterEach(() => {
			logs = [];
			debug.disable();
			(debug.log as sinon.SinonStub).restore();
		});

		it("success", async () => {
			container.slowLogThreshold = 100;
			const d = container.definitionWithFactory(() => {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(undefined);
					}, 150);
				});
			});

			await container.resolve(d);
			expect(logs[0]).toEqual(expect.stringMatching(/long time to create/));
		});

		it("disabling", async () => {
			container.slowLogThreshold = 0;

			const d = container.definitionWithFactory(() => {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(undefined);
					}, 150);
				});
			});

			await container.resolve(d);
			expect(logs).toHaveLength(0);
		});

		it("custom threshold", async () => {
			container.slowLogThreshold = 500;

			const d = container.definitionWithFactory(() => {
				return new Promise(resolve => {
					setTimeout(() => {
						resolve(undefined);
					}, 550);
				});
			});

			await container.resolve(d);
			expect(logs[0]).toEqual(expect.stringMatching(/long time to create/));
		});
	});

	describe("aliasing", () => {
		it("success", () => {
			const service = { service: "value" };
			const container = create();
			const container2 = create();
			const definition = container.definitionWithValue(service);

			const newDef = container2.alias(definition);

			expect(newDef).toBeInstanceOf(Definition);

			expect(newDef).not.toStrictEqual(definition);

			return expect(container2.get(newDef.name)).resolves.toStrictEqual(service);
		});
	});
});
