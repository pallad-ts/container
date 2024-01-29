import { Definition } from "@src/Definition";
import { Container } from "@src/Container";
import * as sinon from "sinon";
import { TransformArgument } from "@src/arguments/TransformArgument";
import { ContainerArgument } from "@src/arguments/ContainerArgument";

describe("TransformArgument", () => {
	const VALUE = "foo";
	const DEFINITION_1 = Definition.useValue("val");

	const ARG_WITH_DEPS = new (class extends ContainerArgument<string> {
		resolve(): Promise<any> {
			return Promise.resolve(VALUE);
		}

		*dependencies() {
			yield DEFINITION_1;
		}
	})();

	const ARG_SIMPLE = new (class extends ContainerArgument<string> {
		resolve(): Promise<string> {
			return Promise.resolve(VALUE);
		}

		*dependencies() {}
	})();

	it("applies transform function on arg result", async () => {
		const stub = sinon.stub().returnsArg(0);
		const container = new Container();

		const arg = new TransformArgument(stub, ARG_SIMPLE);

		expect(Array.from(arg.dependencies(container))).toEqual([]);

		await expect(arg.resolve(container)).resolves.toEqual(VALUE);

		sinon.assert.calledWithExactly(stub, VALUE);
	});

	it("returns the same deps as arg", () => {
		const stub = sinon.stub().returnsArg(0);
		const container = new Container();

		const arg = new TransformArgument(stub, ARG_WITH_DEPS);

		expect(Array.from(arg.dependencies(container))).toEqual([DEFINITION_1]);
	});
});
