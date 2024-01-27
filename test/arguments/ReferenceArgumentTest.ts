import { Container } from "@src/Container";
import { TypeReference } from "@src/TypeReference";
import { ReferenceArgument } from "@src/arguments/ReferenceArgument";
import { ERRORS } from "@src/errors";
import "@pallad/errors-dev";

describe("ReferenceArgument", () => {
	let container: Container;

	const serviceA = { service: "A" };
	const serviceB = { service: "B" };
	const serviceD = { service: "D" };

	const ANNOTATION_NAME = "annotationName";
	const ANNOTATION = { name: "ExtraAnnotation" };
	const AMBIGUOUS_ANNOTATION = { name: "ambiguous" };

	class A {}

	class B {}

	class D extends B {}

	beforeEach(() => {
		container = new Container();

		container
			.definition("A")
			.useValue(serviceA)
			.setFinalType(A)
			.annotate({ name: ANNOTATION_NAME })
			.annotate(AMBIGUOUS_ANNOTATION);

		container
			.definition("B")
			.useValue(serviceB)
			.setFinalType(B)
			.annotate(ANNOTATION)
			.annotate(AMBIGUOUS_ANNOTATION);

		container.definition("D").useValue(serviceD).setFinalType(D);
	});

	describe("one", () => {
		it("by name", async () => {
			const ref = ReferenceArgument.one.name("A");
			expect(Array.from(ref.dependencies(container))).toEqual([
				container.findDefinitionByName("A"),
			]);

			expect(await ref.resolve(container)).toEqual(serviceA);
		});

		it("by name - not found", () => {
			const ref = ReferenceArgument.one.name("C");
			expect(() => {
				Array.from(ref.dependencies(container));
			}).toThrowErrorWithCode(ERRORS.NO_MATCHING_SERVICE);
		});

		it("by predicate", async () => {
			const ref = ReferenceArgument.one.predicate(d => d.name === "B");

			expect(Array.from(ref.dependencies(container))).toEqual([
				container.findDefinitionByName("B"),
			]);

			expect(await ref.resolve(container)).toEqual(serviceB);
		});

		it("by predicate - not found", () => {
			const ref = ReferenceArgument.one.predicate(() => false);

			expect(() => {
				Array.from(ref.dependencies(container));
			}).toThrowErrorWithCode(ERRORS.NO_MATCHING_SERVICE);
		});

		it("by predicate - ambiguous error", () => {
			const ref = ReferenceArgument.one.predicate(() => true);

			expect(() => {
				Array.from(ref.dependencies(container));
			}).toThrowErrorWithCode(ERRORS.AMBIGUOUS_SERVICE);
		});

		it("by annotation", async () => {
			const ref = ReferenceArgument.one.annotation(
				(a): a is any => (a as any).name === ANNOTATION_NAME
			);

			expect(Array.from(ref.dependencies(container))).toEqual([
				container.findDefinitionByName("A"),
			]);

			expect(await ref.resolve(container)).toEqual(serviceA);
		});

		it("by annotation - not found", () => {
			const ref = ReferenceArgument.one.annotation((a): a is any => false);

			expect(() => {
				Array.from(ref.dependencies(container));
			}).toThrowErrorWithCode(ERRORS.NO_MATCHING_SERVICE);
		});

		it("by annotation - ambiguous error", () => {
			const ref = ReferenceArgument.one.annotation(
				(a): a is any => (a as any).name === AMBIGUOUS_ANNOTATION.name
			);

			expect(() => {
				Array.from(ref.dependencies(container));
			}).toThrowErrorWithCode(ERRORS.AMBIGUOUS_SERVICE);
		});

		it("by type", () => {
			const ref = ReferenceArgument.one.type(TypeReference.createFromClass(A)!);

			expect(Array.from(ref.dependencies(container))).toEqual([
				container.findDefinitionByName("A"),
			]);
		});

		it("by type - ambiguous error", () => {
			const ref = ReferenceArgument.one.type(TypeReference.createFromClass(B)!);
			expect(() => {
				Array.from(ref.dependencies(container));
			}).toThrowErrorWithCode(ERRORS.AMBIGUOUS_SERVICE);
		});
	});

	describe("multi", () => {
		it("by annotation", async () => {
			const ref = ReferenceArgument.multi.annotation(
				(a): a is any => (a as any).name === AMBIGUOUS_ANNOTATION.name
			);

			expect(Array.from(ref.dependencies(container))).toEqual([
				container.findDefinitionByName("A"),
				container.findDefinitionByName("B"),
			]);

			expect(await ref.resolve(container)).toEqual([serviceA, serviceB]);
		});

		it("by annotation - nothing found", async () => {
			const ref = ReferenceArgument.multi.annotation((a): a is any => false);

			expect(Array.from(ref.dependencies(container))).toHaveLength(0);

			expect(await ref.resolve(container)).toHaveLength(0);
		});

		it("by predicate", async () => {
			const ref = ReferenceArgument.multi.predicate(d => d.name === "A");

			expect(Array.from(ref.dependencies(container))).toEqual([
				container.findDefinitionByName("A"),
			]);

			expect(await ref.resolve(container)).toEqual([serviceA]);
		});

		it("by predicate - nothing found", async () => {
			const ref = ReferenceArgument.multi.predicate(() => false);

			expect(Array.from(ref.dependencies(container))).toHaveLength(0);
			expect(await ref.resolve(container)).toHaveLength(0);
		});

		it("by type", () => {
			const ref = ReferenceArgument.multi.type(TypeReference.createFromClass(B)!);

			expect(Array.from(ref.dependencies(container))).toEqual([
				container.findDefinitionByName("B"),
				container.findDefinitionByName("D"),
			]);
		});
	});
});
