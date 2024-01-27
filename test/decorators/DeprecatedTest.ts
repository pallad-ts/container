import { deprecated, Deprecated, Service } from "@src/.";
import { extractDefinitionFromClass } from "@src/classServiceMetadata";

describe("Deprecated", () => {
	const NOTE = "Some deprecation note";

	it("adding to a class", () => {
		@Deprecated(NOTE)
		@Service()
		class SomeClass {}

		const definition = extractDefinitionFromClass(SomeClass);
		const annotation = deprecated(NOTE);
		expect(definition.annotations).toContainEqual(annotation);
	});
});
