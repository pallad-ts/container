import { Definition } from "../Definition";
import { Container } from "../Container";
import { createAnnotationFactory } from "../createAnnotationFactory";

export type Hook = (this: Container, service: any) => any | Promise<any>;

const annotationFactory = createAnnotationFactory("__onActivation", (hook: Hook) => {
	return { hook };
});

export const onActivation = annotationFactory;

export function activationMiddleware(this: Container, definition: Definition, next: Function) {
	const service = next(definition);

	const hooks = definition.annotations.filter(annotationFactory.predicate).map(a => a.hook);

	if (hooks.length) {
		let promise = Promise.resolve(service);
		for (const hook of hooks) {
			promise = promise.then(hook.bind(this));
		}
		return promise;
	}
	return service;
}
