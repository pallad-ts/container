import { ServiceName } from "./types";
import { ReferenceArgument } from "./arguments/ReferenceArgument";

export interface Reference {
	(name: ServiceName): ReferenceArgument;

	predicate: typeof ReferenceArgument.one.predicate;
	annotation: typeof ReferenceArgument.one.annotation;
	type: typeof ReferenceArgument.one.type;
	multi: typeof ReferenceArgument.multi;
}

export const reference = function (name: ServiceName) {
	return ReferenceArgument.one.name(name);
} as Reference;

reference.predicate = ReferenceArgument.one.predicate;
reference.annotation = ReferenceArgument.one.annotation;
reference.type = ReferenceArgument.one.type;
reference.multi = ReferenceArgument.multi;
