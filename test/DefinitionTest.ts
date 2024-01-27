import { Definition } from "@src/Definition";
import * as sinon from "sinon";
import { TypeReference } from "@src/TypeReference";
import { Container } from "@src/Container";
import { ERRORS } from "@src/errors";
import "@pallad/errors-dev";

describe("Definition", () => {
	const ARGS = [1, 2, 3];
	const CONTEXT = { foo: "bar" };

	let definition: Definition;

	beforeEach(() => {
		definition = new Definition("name");
	});

	it("via static create", () => {
		const def = new Definition("name");
		expect(def.name).toEqual("name");
	});

	it("using constructor", () => {
		const spy = sinon.spy();

		class Test {
			constructor() {
				spy.apply(this, arguments as any);
			}
		}

		expect(definition.useConstructor(Test)).toStrictEqual(definition);

		expect(definition.finalType).toEqual(TypeReference.createFromClass(Test));

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

		expect(definition.useClass(Test)).toStrictEqual(definition);
		expect(definition.finalType).toEqual(TypeReference.createFromClass(Test));

		const result = definition.factory.apply(CONTEXT, ARGS);
		expect(result).toBeInstanceOf(Test);
		sinon.assert.calledWithExactly(spy, ...ARGS);
	});

	it("using factory", () => {
		const expectedResult = { foo: "bar" };
		const stub = sinon.stub().returns(expectedResult);

		expect(definition.useFactory(stub)).toStrictEqual(definition);

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

		expect(definition.useFactory(stub, Foo)).toStrictEqual(definition);

		const result = definition.factory.apply(CONTEXT, ARGS);
		expect(definition.finalType).toEqual(TypeReference.createFromClass(Foo));

		expect(result).toStrictEqual(expectedResult);
		sinon.assert.calledOn(stub, CONTEXT);
		sinon.assert.calledWithExactly(stub, ...ARGS);
	});

	it("using value", () => {
		const expectedResult = { foo: "bar" };

		expect(definition.useValue(expectedResult)).toStrictEqual(definition);
		expect(definition.factory.apply(CONTEXT, ARGS)).toStrictEqual(expectedResult);
	});

	it("setting args", () => {
		definition.withArguments(...ARGS);
		expect(definition.arguments).toEqual(ARGS);
	});

	it("annotation", () => {
		const annotation = { name: "test" };

		expect(definition.annotate(annotation)).toStrictEqual(definition);
		expect(definition.annotations).toEqual([annotation]);
	});

	it("multiple annotations", () => {
		const annotation1 = { name: "test1" };
		const annotation2 = { name: "test2" };

		expect(definition.annotate(annotation1, annotation2)).toStrictEqual(definition);
		expect(definition.annotations).toEqual([annotation1, annotation2]);
	});

	it("locking makes object immutable", () => {
		const definition = new Definition("name")
			.annotate("someAnnotation")
			.withArguments("some", "args");

		definition.lock();

		expect(Object.isFrozen(definition)).toBe(true);
		expect(() => {
			definition.annotate("someAnnotation");
		}).toThrowErrorWithCode(ERRORS.DEFINITION_IS_LOCKED);

		expect(() => {
			definition.useValue({});
		}).toThrowErrorWithCode(ERRORS.DEFINITION_IS_LOCKED);

		expect(() => {
			definition.useFactory(() => ({}));
		}).toThrowErrorWithCode(ERRORS.DEFINITION_IS_LOCKED);

		expect(() => {
			definition.useClass(class Test {});
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
			const def = new Definition().useValue("foo");

			def.setOwner(container);
			expect(def.owner).toStrictEqual(container);
		});

		it("owner cannot be set twice", () => {
			const def = new Definition().useValue("foo");

			def.setOwner(container);

			expect(() => {
				const newContainer = new Container();
				def.setOwner(newContainer);
			}).toThrowErrorWithCode(ERRORS.OWNER_CANNOT_BE_CHANGED);
		});
	});

	describe("aliasing", () => {
		let definition: Definition;

		const annotation = { ann: 1 };
		const annotation2 = { ann: 2 };
		beforeEach(() => {
			definition = new Definition()
				.useValue({ service: 1 })
				.annotate(annotation, annotation2);
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

				const def = definition.createAlias();

				container.registerDefinition(definition);
				container2.registerDefinition(def);

				const service = { service: "test" };
				const stub = sinon.stub().returns(service);
				definition.useFactory(stub);

				await expect(container2.resolve(def)).resolves.toStrictEqual(service);

				sinon.assert.calledOnce(stub);
			});

			it("fails if aliased definition has no container", () => {
				const container2 = new Container();

				definition = new Definition().useValue("test");

				const def = definition.createAlias();
				container2.registerDefinition(def);

				return expect(container2.resolve(def)).rejects.toThrowError(
					"lack of assigned container"
				);
			});
		});
	});
});
