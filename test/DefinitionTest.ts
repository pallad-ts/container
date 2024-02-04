import { Definition } from "@src/Definition";
import * as sinon from "sinon";
import { TypeReference } from "@src/TypeReference";
import { Container } from "@src/Container";
import { ERRORS } from "@src/errors";
import "@pallad/errors-dev";
import { createContainer } from "@src/createContainer";

describe("Definition", () => {
	const ARGS = [1, 2, 3];
	const CONTEXT = { foo: "bar" };

	it("using constructor", () => {
		const spy = sinon.spy();

		class Test {
			constructor() {
				spy.apply(this, arguments as any);
			}
		}

		const definition = Definition.useConstructor(Test);

		expect(definition.name).toMatch(/^Test.+/);
		expect(definition.finalType).toEqual(new TypeReference(Test));

		const result = definition.factory.apply(CONTEXT, ARGS);
		expect(result).toBeInstanceOf(Test);
		sinon.assert.calledWithExactly(spy, ...ARGS);
	});

	it("using class", () => {
		const spy = sinon.spy();

		class Test {
			constructor() {
				spy.apply(this, arguments as any);
			}
		}

		const definition = Definition.useClass(Test);
		expect(definition.finalType).toEqual(new TypeReference(Test));

		expect(definition.name).toMatch(/^Test.+/);
		const result = definition.factory.apply(CONTEXT, ARGS);
		expect(result).toBeInstanceOf(Test);
		sinon.assert.calledWithExactly(spy, ...ARGS);
	});

	it("using factory", () => {
		const expectedResult = { foo: "bar" };
		const stub = sinon.stub().returns(expectedResult);

		const definition = Definition.useFactory(stub);

		const result = definition.factory.apply(CONTEXT, ARGS);
		expect(definition.finalType).toBeUndefined();

		expect(result).toStrictEqual(expectedResult);
		sinon.assert.calledOn(stub, CONTEXT);
		sinon.assert.calledWithExactly(stub, ...ARGS);
	});

	it("using factory with type", () => {
		class Foo {}

		const expectedResult = new Foo();
		const stub = sinon.stub().returns(expectedResult);

		const definition = Definition.useFactory(stub, { type: Foo });

		const result = definition.factory.apply(CONTEXT, ARGS);
		expect(definition.finalType).toEqual(new TypeReference(Foo));

		expect(result).toStrictEqual(expectedResult);
		sinon.assert.calledOn(stub, CONTEXT);
		sinon.assert.calledWithExactly(stub, ...ARGS);
	});

	it("using value", () => {
		const expectedResult = { foo: "bar" };

		const definition = Definition.useValue(expectedResult);
		expect(definition.factory.apply(CONTEXT, ARGS)).toStrictEqual(expectedResult);
	});

	it("setting args", () => {
		const definition = Definition.useValue("foo", "name");
		definition.withArguments(...ARGS);
		expect(definition.arguments).toEqual(ARGS);
	});

	it("annotation", () => {
		const annotation = { name: "test" };

		const definition = Definition.useValue("foo", "name");
		expect(definition.annotate(annotation)).toStrictEqual(definition);
		expect(definition.annotations).toEqual([annotation]);
	});

	it("multiple annotations", () => {
		const annotation1 = { name: "test1" };
		const annotation2 = { name: "test2" };

		const definition = Definition.useValue("foo", "name");
		expect(definition.annotate(annotation1, annotation2)).toStrictEqual(definition);
		expect(definition.annotations).toEqual([annotation1, annotation2]);
	});

	it("locking makes object immutable", () => {
		const definition = Definition.useValue("foo", "name")
			.annotate("someAnnotation")
			.withArguments("some", "args");

		definition.lock();

		expect(Object.isFrozen(definition)).toBe(true);
		expect(() => {
			definition.annotate("someAnnotation");
		}).toThrowErrorWithCode(ERRORS.DEFINITION_IS_LOCKED);

		expect(() => {
			definition.withArguments([]);
		}).toThrowErrorWithCode(ERRORS.DEFINITION_IS_LOCKED);
	});

	describe("setting owner", () => {
		let container: Container;
		beforeEach(() => {
			container = new Container();
		});

		it("success", () => {
			const def = Definition.useValue("foo");

			def.setOwner(container);
			expect(def.owner).toStrictEqual(container);
		});

		it("owner cannot be set twice", () => {
			const def = Definition.useValue("foo");

			def.setOwner(container);

			expect(() => {
				const newContainer = new Container();
				def.setOwner(newContainer);
			}).toThrowErrorWithCode(ERRORS.OWNER_CANNOT_BE_CHANGED);
		});
	});

	it("setting name", () => {
		const definition = Definition.useValue("foo", "name");
		definition.setName("newName");
		expect(definition.name).toBe("newName");
	});

	describe("cloning", () => {
		function assertEqualShape(defA: Definition, defB: Definition) {
			expect(defA.finalType).toEqual(defB.finalType);
			expect(defA.factory).toEqual(defB.factory);
			expect(defA.arguments).toEqual(defB.arguments);
			expect(defA.annotations).toEqual(defB.annotations);
		}

		it("clones definition and makes it non-locked", () => {
			const definition = Definition.useValue("foo", "name");

			const clonedDefinition = definition.clone();

			assertEqualShape(definition, clonedDefinition);
			expect(clonedDefinition.name).toBe(definition.name);
			expect(clonedDefinition).not.toBe(definition);
		});

		it("clones definition with new name", () => {
			const definition = Definition.useValue("foo", "name");
			const clonedDefinition = definition.clone("newName");
			assertEqualShape(definition, clonedDefinition);
			expect(clonedDefinition.name).toBe("newName");
		});

		it("clones arguments and annotations", () => {
			const definition = Definition.useValue("foo", "name")
				.annotate({ ann: 1 }, { ann: 2 })
				.withArguments(1, 2, 3);
			const clonedDefinition = definition.clone();

			assertEqualShape(definition, clonedDefinition);
			expect(clonedDefinition.name).toBe(definition.name);
		});
	});

	describe("aliasing", () => {
		let definition: Definition;

		const annotation = { ann: 1 };
		const annotation2 = { ann: 2 };
		beforeEach(() => {
			definition = Definition.useValue({ service: 1 }).annotate(annotation, annotation2);
		});

		describe("treating name", () => {
			it("uses the same", () => {
				const def = definition.createAlias();
				expect(def.name).toEqual(definition.name);
			});

			it("allows to change", () => {
				const name = "newName";
				const def = definition.createAlias({ name });

				expect(def.name).toEqual(name);
			});
		});

		describe("annotations", () => {
			it("passes no annotations by default", () => {
				const def = definition.createAlias();

				expect(def.annotations).toHaveLength(0);
			});

			it("passes all annotations if flag set to true", () => {
				const def = definition.createAlias({
					forwardAnnotations: true,
				});

				expect(def.annotations).toEqual(definition.annotations);
			});

			it("passes no annotations if flag set to false", () => {
				const def = definition.createAlias({
					forwardAnnotations: false,
				});

				expect(def.annotations).toHaveLength(0);
			});

			it("passes annotation that satisfies predicate", () => {
				//tslint:disable-next-line: strict-comparisons
				const predicate = (x: any) => x === annotation;

				const def = definition.createAlias({
					forwardAnnotations: predicate,
				});

				expect(def.annotations).toEqual([annotation]);
			});
		});

		describe("creating", () => {
			it("success", async () => {
				const container = new Container();
				const container2 = new Container();

				const service = { service: "test" };
				const stub = sinon.stub().returns(service);
				const definition = Definition.useFactory(stub);
				const aliasedDefinition = definition.createAlias();

				container.registerDefinition(definition);
				container2.registerDefinition(aliasedDefinition);

				await expect(container2.resolve(aliasedDefinition)).resolves.toStrictEqual(service);

				sinon.assert.calledOnce(stub);
			});

			it("fails if aliased definition has no container", () => {
				const container2 = new Container();

				definition = Definition.useValue("test");

				const def = definition.createAlias();
				container2.registerDefinition(def);

				return expect(container2.resolve(def)).rejects.toThrowError(
					"lack of assigned container"
				);
			});
		});
	});
});
