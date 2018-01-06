import {Definition} from "../Definition";

const activationAnnotationName = '__onActivation';

export type Hook = (service: any) => any | Promise<any>;

export interface ActivationAnnotation {
    name: string,
    hook: Hook
}

export function onActivation(hook: Hook): ActivationAnnotation {
    return {
        name: activationAnnotationName,
        hook
    };
}

export function activationMiddleware(definition: Definition, next: Function) {
    const service = next(definition);

    const hooks = definition.annotations
        .filter((a: ActivationAnnotation) => a.name === activationAnnotationName)
        .map((a: ActivationAnnotation) => a.hook);


    if (hooks.length) {
        let promise = Promise.resolve(service);
        for (const hook of hooks) {
            promise = promise.then(hook.bind(this))
        }
        return promise;
    }
    return service;
}