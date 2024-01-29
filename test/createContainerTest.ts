import { config, Container, createContainer, Definition, deprecated, onActivation } from "@src/.";
import * as sinon from "sinon";

describe("createContainer", () => {
	it("standard container with all options", async () => {
		const CONFIG = { some: "config" };
		const NOTE = "deprecation note";
		const SERVICE = { a: "service" };
		const deprecationMessageFunc = sinon.spy();

		const container = createContainer({
			config: CONFIG,
			deprecationMessageFunc: deprecationMessageFunc,
		});

		const activationHook = sinon.stub().resolves(SERVICE);
		const factory = sinon.stub().resolves(SERVICE);

		const definition = Definition.useFactory(factory, "foo")
			.withArguments(config("some"))
			.annotate(onActivation(activationHook))
			.annotate(deprecated(NOTE));

		container.registerDefinition(definition);

		const service = await container.resolve(definition.name);

		expect(service).toEqual(SERVICE);
		sinon.assert.calledWith(factory, CONFIG.some);
		sinon.assert.calledWith(activationHook, SERVICE);
		sinon.assert.calledWith(deprecationMessageFunc, `Service foo is deprecated: ${NOTE}`);
	});
});
