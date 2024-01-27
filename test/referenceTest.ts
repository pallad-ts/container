import { reference } from "@src/reference";
import { ReferenceArgument } from "@src/arguments/ReferenceArgument";

describe("reference", () => {
	const PREDICATE = () => true;
	const ANNOTATION_PREDICATE = (ann: any): ann is any => true;
	it("main function", () => {
		expect(reference("name")).toEqual(ReferenceArgument.one.name("name"));
	});

	it("one by predicate", () => {
		expect(reference.predicate(PREDICATE)).toEqual(ReferenceArgument.one.predicate(PREDICATE));
	});

	it("on by annotation", () => {
		expect(reference.annotation(ANNOTATION_PREDICATE)).toEqual(
			ReferenceArgument.one.annotation(ANNOTATION_PREDICATE)
		);
	});

	it("multi by predicate", () => {
		expect(reference.multi.predicate(PREDICATE)).toEqual(
			ReferenceArgument.multi.predicate(PREDICATE)
		);
	});

	it("multi by annotation", () => {
		expect(reference.multi.annotation(ANNOTATION_PREDICATE)).toEqual(
			ReferenceArgument.multi.annotation(ANNOTATION_PREDICATE)
		);
	});
});
