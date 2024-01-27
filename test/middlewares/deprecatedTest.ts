import { Definition, deprecated, deprecatedMiddleware, deprecatedAnnotationName } from "@src/.";
import * as sinon from "sinon";

describe("deprecated", () => {
	const COMMENT = "Some comment";
	const COMMENT_2 = "Extra comment";

	it("annotation", () => {
		const annotation = deprecated(COMMENT);

		expect(annotation).toEqual({
			name: deprecatedAnnotationName,
			comment: COMMENT,
		});
	});

	describe("middleware", () => {
		let definition: Definition;
		let next: sinon.SinonSpy;

		beforeEach(() => {
			definition = new Definition("someServiceName");
			definition.useValue("some value");

			next = sinon.spy();
		});

		it("single deprecation note", () => {
			definition.annotate(deprecated(COMMENT));

			const messageFunc = sinon.spy();
			deprecatedMiddleware(messageFunc)(definition, next);

			sinon.assert.calledWith(
				messageFunc,
				`Service ${definition.name.toString()} is deprecated: ${COMMENT}`
			);
		});

		it("multiple deprecation notes", () => {
			definition.annotate(deprecated(COMMENT));
			definition.annotate(deprecated(COMMENT_2));

			const messageFunc = sinon.spy();
			deprecatedMiddleware(messageFunc)(definition, next);

			sinon.assert.calledWith(
				messageFunc,
				`Service ${definition.name.toString()} is deprecated: ${COMMENT}, ${COMMENT_2}`
			);
		});

		it("no deprecation annotations", () => {
			const messageFunc = sinon.spy();
			deprecatedMiddleware(messageFunc)(definition, next);

			sinon.assert.notCalled(messageFunc);
		});
	});
});
