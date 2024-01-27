import { Container } from "@src/Container";
import { ERRORS } from "@src/errors";
import "@pallad/errors-dev";
import { assertNoCircularDependencies } from "@src/assertNoCircularDependencies";
import { ReferenceArgument } from "@src/arguments/ReferenceArgument";

let container: Container;

function assertCircularDependencyFound(serviceName: string) {
	expect(() => {
		assertNoCircularDependencies(container, container.findDefinitionByName(serviceName)!);
	}).toThrowErrorWithCode(ERRORS.CIRCULAR_DEPENDENCY_DETECTED);
}

describe("assertNoCircularDependencies", () => {
	beforeEach(() => {
		container = new Container();
	});

	it("simple circular dependency", () => {
		container.definition("A").withArguments(ReferenceArgument.one.name("B"));

		container.definition("B").withArguments(ReferenceArgument.one.name("A"));

		assertCircularDependencyFound("A");
	});

	it("simple circular dependency for services with regular arguments", () => {
		container
			.definition("A")
			.withArguments("foo", "bar", ReferenceArgument.one.name("B"), "foo1");

		container.definition("B").withArguments(ReferenceArgument.one.name("A"), "bar");
		assertCircularDependencyFound("A");
	});

	describe("2 level circular dependency", () => {
		it("simple", () => {
			container.definition("A").withArguments(ReferenceArgument.one.name("B"));

			container.definition("B").withArguments(ReferenceArgument.one.name("C"));

			container.definition("C").withArguments(ReferenceArgument.one.name("A"));

			assertCircularDependencyFound("A");
		});

		it("dependency of dependency", () => {
			container.definition("A").withArguments(ReferenceArgument.one.name("B"));

			container.definition("B").withArguments(ReferenceArgument.one.name("C"));

			container.definition("C").withArguments(ReferenceArgument.one.name("B"));

			assertCircularDependencyFound("A");
		});

		it("with multi services arg", () => {
			container.definition("A").withArguments(ReferenceArgument.one.name("B"));

			container.definition("B").withArguments(ReferenceArgument.one.name("C"));

			container
				.definition("C")
				.withArguments(
					ReferenceArgument.multi.predicate(d => d.name === "A" || d.name === "B")
				);

			assertCircularDependencyFound("A");
		});
	});

	it("3 levels circular dependency", () => {
		container.definition("A").withArguments(ReferenceArgument.one.name("B"));

		container.definition("B").withArguments(ReferenceArgument.one.name("C"));

		container.definition("C").withArguments(ReferenceArgument.one.name("D"));

		container.definition("D").withArguments(ReferenceArgument.one.name("A"));

		assertCircularDependencyFound("A");
	});
});
