import { Definition } from "../Definition";
import { createAnnotationFactory } from "../createAnnotationFactory";

export const deprecatedAnnotationName = "__deprecatedService";

const annotationFactory = createAnnotationFactory("__deprecatedService", (comment: string) => {
	return { comment };
});

export const deprecated = annotationFactory;

export type DeprecationMessageFunc = (message: string) => void;

// eslint-disable-next-line no-console
export function deprecatedMiddleware(messageFunc: DeprecationMessageFunc = console.warn) {
	return (definition: Definition, next: Function) => {
		const deprecatedAnnotations = definition.annotations.filter(annotationFactory.predicate);

		if (deprecatedAnnotations.length) {
			const deprecationNote = deprecatedAnnotations.map(d => d.comment).join(", ");
			messageFunc(`Service ${definition.name.toString()} is deprecated: ` + deprecationNote);
		}

		return next(definition);
	};
}
