import * as errors from './errors';
import {Container} from './Container';

import {
    onActivation as onActivationAnnotation,
    activationMiddleware as _activationMiddleware
} from './middlewares/activation';

export * from './Definition';
export * from './Container';
export * from './Reference';
export * from './types';
export * from './ContainerArg';
export * from './referenceFunc';

export {errors};

export function create() {
    return new Container();
}

export const activationMiddleware = _activationMiddleware;
export const onActivation = onActivationAnnotation;