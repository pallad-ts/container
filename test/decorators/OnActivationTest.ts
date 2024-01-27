import { onActivation, Service } from "@src/.";
import { OnActivation } from "@src/decorators/OnActivation";
import { extractDefinitionFromClass } from "@src/classServiceMetadata";

describe("OnActivation", () => {
	it("defines annotation", () => {
		// tslint:disable-next-line:no-empty
		const func = function () {};

		@Service()
		@OnActivation(func)
		class Foo {}

		const definition = extractDefinitionFromClass(Foo);
		const annotation = onActivation(func);
		expect(definition.annotations).toEqual([annotation]);
	});
});
