import { Container } from "@src/Container";
import { ERRORS } from "@src/errors";
import "@pallad/errors-dev";
import { assertNoCircularDependencies } from "@src/assertNoCircularDependencies";
import { ReferenceArgument } from "@src/arguments/ReferenceArgument";
import { Definition } from "@src/Definition";

describe("assertNoCircularDependencies", () => {
	let container: Container;

	const FACTORY = () => {
		return "nothing";
	};

	function assertCircularDependencyFound() {
		expect(() => {
			assertNoCircularDependencies(container, container.findDefinitionByName("A")!);
		}).toThrowErrorWithCode(ERRORS.CIRCULAR_DEPENDENCY_DETECTED);
	}

	beforeEach(() => {
		container = new Container();
	});

	it("simple circular dependency", () => {
		container.registerDefinition(
			Definition.useFactory(FACTORY, "A").withArguments(ReferenceArgument.one.name("B"))
		);

		container.registerDefinition(
			Definition.useFactory(FACTORY, "B").withArguments(ReferenceArgument.one.name("A"))
		);

		assertCircularDependencyFound();
	});

	it("simple circular dependency for services with regular arguments", () => {
		container
			.registerDefinition(
				Definition.useFactory(FACTORY, "A").withArguments(
					"foo",
					"bar",
					ReferenceArgument.one.name("B"),
					"foo1"
				)
			)
			.registerDefinition(
				Definition.useFactory(FACTORY, "B").withArguments(
					ReferenceArgument.one.name("A"),
					"bar"
				)
			);

		assertCircularDependencyFound();
	});

	describe("2 level circular dependency", () => {
		it("simple", () => {
			container
				.registerDefinition(
					Definition.useFactory(FACTORY, "A").withArguments(
						ReferenceArgument.one.name("B")
					)
				)
				.registerDefinition(
					Definition.useFactory(FACTORY, "B").withArguments(
						ReferenceArgument.one.name("C")
					)
				)
				.registerDefinition(
					Definition.useFactory(FACTORY, "C").withArguments(
						ReferenceArgument.one.name("A")
					)
				);

			assertCircularDependencyFound();
		});

		it("dependency of dependency", () => {
			container
				.registerDefinition(
					Definition.useFactory(FACTORY, "A").withArguments(
						ReferenceArgument.one.name("B")
					)
				)
				.registerDefinition(
					Definition.useFactory(FACTORY, "B").withArguments(
						ReferenceArgument.one.name("C")
					)
				)
				.registerDefinition(
					Definition.useFactory(FACTORY, "C").withArguments(
						ReferenceArgument.one.name("B")
					)
				);

			assertCircularDependencyFound();
		});

		it("with multi services arg", () => {
			container
				.registerDefinition(
					Definition.useFactory(FACTORY, "A").withArguments(
						ReferenceArgument.one.name("B")
					)
				)
				.registerDefinition(
					Definition.useFactory(FACTORY, "B").withArguments(
						ReferenceArgument.one.name("C")
					)
				)
				.registerDefinition(
					Definition.useFactory(FACTORY, "C").withArguments(
						ReferenceArgument.multi.predicate(d => d.name === "A" || d.name === "B")
					)
				);

			assertCircularDependencyFound();
		});
	});

	it("3 levels circular dependency", () => {
		container
			.registerDefinition(
				Definition.useFactory(FACTORY, "A").withArguments(ReferenceArgument.one.name("B"))
			)
			.registerDefinition(
				Definition.useFactory(FACTORY, "B").withArguments(ReferenceArgument.one.name("C"))
			)
			.registerDefinition(
				Definition.useFactory(FACTORY, "C").withArguments(ReferenceArgument.one.name("D"))
			)
			.registerDefinition(
				Definition.useFactory(FACTORY, "D").withArguments(ReferenceArgument.one.name("A"))
			);

		assertCircularDependencyFound();
	});
});
