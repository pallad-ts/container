import { TypeReference } from "@src/TypeReference";
import { Definition } from "@src/Definition";

describe("TypeRef", () => {
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
			expect(TypeReference.createFromClass(Foo)!.matches(new TypeReference(Foo))).toEqual(
				true
			);
		});

		it("satisfied if target is instance of root type", () => {
			expect(TypeReference.createFromClass(Foo)!.matches(new TypeReference(Bar))).toEqual(
				true
			);
		});

		it("not satisfied if type is not related", () => {
			expect(TypeReference.createFromClass(Foo)!.matches(new TypeReference(Gamma))).toEqual(
				false
			);
		});
	});

	describe("predicate", () => {
		it("returns false for definitions without type", () => {
			const definition = new Definition();
			expect(TypeReference.createFromClass(Foo)!.predicate(definition)).toEqual(false);
		});

		it("returns true for definition with matching type", () => {
			const definition = new Definition().setFinalType(Foo);

			expect(TypeReference.createFromClass(Foo)!.predicate(definition)).toEqual(true);
		});

		it("return false for definition without matching type", () => {
			const definition = new Definition().setFinalType(Gamma);

			expect(TypeReference.createFromClass(Foo)!.predicate(definition)).toEqual(false);
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
				}).toThrowErrorMatchingSnapshot();
			}
		);

		describe("from value", () => {
			it.each([[false], [true], ["str"], [undefined]])("ignores non objects: %s", value => {
				expect(TypeReference.createFromValue(value)).toBeUndefined();
			});

			it("ignores null", () => {
				// tslint:disable-next-line:no-null-keyword
				expect(TypeReference.createFromValue(null)).toBeUndefined();
			});

			it.each([[{}], [Math.min], [Promise.resolve("test")]])(
				"ignores value that is an instance of reserved type: %s",
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

		describe("from type", () => {
			it.each(RESERVED_TYPES)("returns undefined for reserved types: %s", constructor => {
				expect(TypeReference.createFromClass(constructor)).toBeUndefined();
			});

			it.each([[Foo], [Bar], [Array]])("success: %s", constructor => {
				expect(TypeReference.createFromClass(constructor)).toEqual(
					new TypeReference(constructor)
				);
			});
		});

		describe("predicate for type", () => {
			it.each(RESERVED_TYPES)("returns undefined for reserved types: %s", constructor => {
				expect(TypeReference.predicateForClass(constructor)).toBeUndefined();
			});

			it("success", () => {
				const definition = new Definition().setFinalType(Foo);

				expect(TypeReference.predicateForClass(Foo)!(definition)).toEqual(true);
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
