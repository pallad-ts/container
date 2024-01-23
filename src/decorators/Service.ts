import "reflect-metadata";
import { ServiceName } from "../types";
import { randomName } from "../randomName";
import { ensureMetadataAttachedToClass } from "../classServiceMetadata";
import * as is from "predicates";
import { TypeRef } from "../TypeRef";
import { ERRORS } from "../errors";
import { ReferenceArg } from "../args/ReferenceArg";

export const Service = function (name?: ServiceName) {
	return function (constructor: { new (...args: any[]): any }) {
		const finalName = name || randomName(constructor.name);

		const metadata = ensureMetadataAttachedToClass(constructor);
		metadata.name = finalName;
		const paramTypes: Function[] = Reflect.getMetadata("design:paramtypes", constructor);

		if (is.array(paramTypes) && constructor.length > 0) {
			for (const [index, paramType] of paramTypes.entries()) {
				if (metadata.constructorArguments[index]) {
					continue;
				}
				const ref = TypeRef.createFromType(paramType);
				if (ref === undefined) {
					throw ERRORS.AUTO_WIRING_FAILED.create(
						`constructor (of ${constructor.name}) argument nr: ${index}`
					);
				}
				metadata.constructorArguments[index] = ReferenceArg.one.type(ref);
			}
		} else if (constructor.length > 0) {
			throw ERRORS.AUTO_WIRING_NO_METADATA.create();
		}
	};
};
