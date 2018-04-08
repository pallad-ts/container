import {ContainerArg} from "../ContainerArg";
import 'reflect-metadata';
import {Reference} from "../Reference";
import * as is from 'predicates';
import {ensureMetadata} from "../serviceMetadata";
import {ServiceName} from "../types";


const assertServiceNameOrContainerArg = is.assert(
    is.any(is.string, is.instanceOf(ContainerArg)),
    '@Inject argument must be a string that represents service name or an object of ContainerArg instance'
);

export function Inject(serviceName: ServiceName | ContainerArg) {
    assertServiceNameOrContainerArg(serviceName);

    const arg = is.any(is.string, is.symbol)(serviceName) ? Reference.one.name(<string | symbol>serviceName) : <ContainerArg>serviceName;
    return function (target: any, property: string | symbol, indexOrDescriptor?: number | TypedPropertyDescriptor<any>) {
        const isParameterDecorator = typeof indexOrDescriptor === 'number';
        if (isParameterDecorator) {
            ensureMetadata(target).constructorArguments[<number>indexOrDescriptor] = arg;
        } else {
            ensureMetadata(target.constructor).propertiesInjectors.set(property, arg);
        }
    }
}