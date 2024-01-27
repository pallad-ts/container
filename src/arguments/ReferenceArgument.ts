import { AnnotationPredicate, ServiceName, DefinitionPredicate } from "../types";
import { Container } from "../Container";
import { Definition } from "../Definition";
import { Lookup } from "../Lookup";
import { ContainerArgument } from "./ContainerArgument";
import { TypeReference } from "../TypeReference";
import { ERRORS } from "../errors";

function toTypeRef(type: TypeReference | Function) {
	return TypeReference.is(type) ? type : new TypeReference(type);
}

export class ReferenceArgument extends ContainerArgument<unknown> {
	static one = {
		name(name: ServiceName) {
			return new ReferenceArgument("one", new Lookup.ByServiceName(name));
		},
		predicate(predicate: DefinitionPredicate) {
			return new ReferenceArgument("one", new Lookup.ByPredicate(predicate));
		},
		annotation<T>(predicate: AnnotationPredicate<T>) {
			return new ReferenceArgument("one", new Lookup.ByAnnotation(predicate));
		},
		type(type: TypeReference | Function) {
			return new ReferenceArgument("one", new Lookup.ByType(toTypeRef(type)));
		},
	};

	static multi = {
		predicate(predicate: DefinitionPredicate) {
			return new ReferenceArgument("multi", new Lookup.ByPredicate(predicate));
		},
		annotation(predicate: AnnotationPredicate<unknown>) {
			return new ReferenceArgument("multi", new Lookup.ByAnnotation(predicate));
		},
		type(type: TypeReference | Function) {
			return new ReferenceArgument("multi", new Lookup.ByType(toTypeRef(type)));
		},
	};

	constructor(
		private readonly type: "one" | "multi",
		private readonly lookup: Lookup
	) {
		super();
		Object.freeze(this);
	}

	resolve(container: Container): Promise<any> {
		const definitions = Array.from(this.findDefinitions(container));

		if (this.type === "one") {
			const definition = definitions[0];

			return container.resolve(definition);
		}

		return Promise.all(
			definitions.map(x => {
				return container.resolve(x);
			})
		);
	}

	*dependencies(container: Container) {
		yield* this.findDefinitions(container);
	}

	private *findDefinitions(container: Container): Generator<Definition> {
		if (this.type === "one") {
			yield this.findOne(container);
		} else {
			yield* this.findMulti(container);
		}
	}

	private findOne(container: Container): Definition {
		const definitions = Array.from(this.lookup.find(container));
		if (definitions.length === 0) {
			throw ERRORS.NO_MATCHING_SERVICE.create(this.lookup);
		}

		if (definitions.length > 1) {
			const servicesNames = definitions.map(s => s.name.toString());
			throw ERRORS.AMBIGUOUS_SERVICE.create(servicesNames, this.lookup);
		}
		return definitions[0];
	}

	private *findMulti(container: Container): Generator<Definition> {
		yield* this.lookup.find(container);
	}
}
