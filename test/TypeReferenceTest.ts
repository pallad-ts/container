import { TypeReference } from "@src/TypeReference";
import { Definition } from "@src/Definition";
import { ERRORS } from "@src/errors";
import "@pallad/errors-dev";

describe("TypeReference", () => {
	class Foo {}

	class Bar extends Foo {}

	class Gamma {}

	const RESERVED_TYPES: any[] = [[Object], [Promise], [Function]];

	it("is", () => {
		expect(TypeReference.is(new TypeReference(Foo))).toEqual(true);

		expect(TypeReference.is("typeref")).toEqual(false);
	});

	describe("matches", () => {
		it("satisfied if type is the same", () => {
			expect(new TypeReference(Foo)!.matches(new TypeReference(Foo))).toEqual(true);
		});

		it("satisfied if target is instance of root type", () => {
			expect(new TypeReference(Foo)!.matches(new TypeReference(Bar))).toEqual(true);
		});

		it("not satisfied if type is not related", () => {
			expect(new TypeReference(Foo)!.matches(new TypeReference(Gamma))).toEqual(false);
		});
	});

	describe("getting prototype chain", () => {
		class A {}

		class B extends A {}

		class C extends B {}

		it("returns prototype chain", () => {
			const chain = [...new TypeReference(C)!.prototypeChain()];
			expect(chain).toEqual([C, B, A]);
		});
	});

	describe("predicate", () => {
		it("returns false for definitions without type", () => {
			const definition = Definition.useValue("test");
			expect(new TypeReference(Foo)!.predicate(definition)).toEqual(false);
		});

		it("returns true for definition with matching type", () => {
			const definition = Definition.useClass(Foo);

			expect(new TypeReference(Foo)!.predicate(definition)).toEqual(true);
		});

		it("return false for definition without matching type", () => {
			const definition = Definition.useClass(Gamma);

			expect(new TypeReference(Foo)!.predicate(definition)).toEqual(false);
		});
	});

	describe("creating", () => {
		it("constructor", () => {
			const ref = new TypeReference(Foo);

			expect(ref.toString()).toEqual('instance of class "Foo"');
		});

		it.each(RESERVED_TYPES)(
			"fails when attempt to create for reserved type: %s",
			constructor => {
				expect(() => {
					// tslint:disable-next-line:no-unused-expression
					new TypeReference(constructor);
				}).toThrowErrorWithCode(ERRORS.INVALID_TYPE_REFERENCE_TARGET);
			}
		);

		describe("from value", () => {
			// eslint-disable-next-line no-null/no-null
			it.each([[false], [true], ["str"], [undefined], [null]])(
				"fails for non objects: %s",
				value => {
					expect(TypeReference.createFromValue(value)).toBeUndefined();
				}
			);

			it.each([[{}], [Math.min], [Promise.resolve("test")]])(
				"fails for values values that are instance of reserved type: %s",
				value => {
					expect(TypeReference.createFromValue(value)).toBeUndefined();
				}
			);

			it.each([
				[new Foo(), Foo],
				[new Bar(), Bar],
				[[], Array],
			])("success: %s", (value, type) => {
				const ref = TypeReference.createFromValue(value);
				expect(ref).toEqual(new TypeReference(type));

				expect(String(ref)).toEqual(`instance of class "${type.name}"`);
			});
		});
	});

	describe("checking if type is reserved", () => {
		it.each([[Foo], [Bar], [RegExp]])("success: %s", constructor => {
			expect(TypeReference.isValidTarget(constructor)).toEqual(true);
		});

		it.each(RESERVED_TYPES)("failed: %s", constructor => {
			expect(TypeReference.isValidTarget(constructor)).toEqual(false);
		});
	});
});
