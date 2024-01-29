import { AnnotationPredicate, DefinitionPredicate } from "./types";
import { Container } from "./Container";
import { Definition } from "./Definition";
import { TypeReference } from "./TypeReference";
import { ServiceName as _ServiceName } from "./types";

export abstract class Lookup {
	abstract find(container: Container): Generator<Definition>;

	abstract toString(): string;
}

export namespace Lookup {
	export class ByServiceName extends Lookup {
		constructor(readonly name: _ServiceName) {
			super();
			Object.freeze(this);
		}

		*find(container: Container): Generator<Definition> {
			const result = container.findDefinitionByName(this.name);
			if (result) {
				yield result;
			}
		}

		toString() {
			return "by service name: " + this.name.toString();
		}
	}

	export class ByAnnotation<T> extends Lookup {
		constructor(readonly predicate: AnnotationPredicate<T>) {
			super();
			Object.freeze(this);
		}

		*find(container: Container) {
			const result = container.findDefinitionByAnnotation(this.predicate);
			for (const [definition] of result) {
				yield definition;
			}
		}

		toString() {
			return "by annotation predicate";
		}
	}

	export class ByPredicate extends Lookup {
		constructor(readonly predicate: DefinitionPredicate) {
			super();
			Object.freeze(this);
		}

		*find(container: Container) {
			yield* container.findDefinitionByPredicate(this.predicate);
		}

		toString() {
			return "by service predicate";
		}
	}

	export class ByType extends Lookup {
		constructor(readonly typeReference: TypeReference) {
			super();
			Object.freeze(this);
		}

		*find(container: Container) {
			yield* container.findDefinitionByClass(this.typeReference.target);
		}

		toString() {
			return "by type: " + this.typeReference.toString();
		}
	}
}
