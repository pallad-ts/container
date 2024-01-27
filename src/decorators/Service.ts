import "reflect-metadata";
import { ClassConstructor, ServiceName } from "../types";
import { ensureMetadataAttachedToClass } from "../classServiceMetadata";
import * as is from "predicates";
import { TypeReference } from "../TypeReference";
import { ERRORS } from "../errors";
import { randomName } from "../utils/randomName";
import { ReferenceArgument } from "../arguments/ReferenceArgument";

export const Service = function (name?: ServiceName) {
	return function (constructor: ClassConstructor<any>) {
		const finalName = name || randomName(constructor.name);

		const metadata = ensureMetadataAttachedToClass(constructor);
		metadata.name = finalName;
		const paramTypes: Array<ClassConstructor<any>> = Reflect.getMetadata(
			"design:paramtypes",
			constructor
		);

		if (is.array(paramTypes) && constructor.length > 0) {
			for (const [index, paramType] of paramTypes.entries()) {
				if (metadata.constructorArguments[index]) {
					continue;
				}
				const ref = TypeReference.createFromClass(paramType);
				if (ref === undefined) {
					throw ERRORS.AUTO_WIRING_FAILED.create(
						`constructor (of ${constructor.name}) argument nr: ${index}`
					);
				}
				metadata.constructorArguments[index] = ReferenceArgument.one.type(ref);
			}
		} else if (constructor.length > 0) {
			throw ERRORS.AUTO_WIRING_NO_METADATA.create();
		}
	};
};
