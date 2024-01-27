import { Container } from "./Container";
import { Definition } from "./Definition";
import { ERRORS } from "./errors";
import { ContainerArgument } from "./arguments/ContainerArgument";

export function assertNoCircularDependencies(container: Container, currentDefinition: Definition) {
	detectCircularDependencies(container, currentDefinition, [currentDefinition]);
}

function detectCircularDependencies(
	container: Container,
	definition: Definition,
	previousDefinitions: Definition[]
) {
	for (const arg of definition.arguments) {
		if (arg instanceof ContainerArgument) {
			const dependencies = arg.dependencies(container);
			for (const dependency of dependencies) {
				if (previousDefinitions.indexOf(dependency) !== -1) {
					const names = previousDefinitions
						.concat([dependency])
						.map(d => d.name.toString());
					throw ERRORS.CIRCULAR_DEPENDENCY_DETECTED.create(names);
				}
				detectCircularDependencies(
					container,
					dependency,
					previousDefinitions.concat([dependency])
				);
			}
		}
	}
}
