import * as isPred from "predicates";
import { ClassConstructor, DefinitionPredicate } from "./types";
import { ERRORS } from "./errors";

const RESERVED_CONSTRUCTORS = new Set<Function>(
	["Function", "Object", "Promise"].map(x => (global as any)[x]).filter(x => x)
);

const RESERVED_PROTOTYPES = new Set([Function.prototype, Object.prototype, Promise.prototype]);

export class TypeReference {
	constructor(readonly target: ClassConstructor<any>) {
		if (!TypeReference.isValidTarget(target)) {
			throw ERRORS.INVALID_TYPE_REFERENCE_TARGET.create(target);
		}
		Object.freeze(this);
	}

	matches(type: TypeReference): boolean {
		//tslint:disable-next-line: strict-comparisons
		return type.target === this.target || type.target.prototype instanceof this.target;
	}

	toString() {
		return `instance of class "${this.target.name}"`;
	}

	get predicate(): DefinitionPredicate {
		return x => x.finalType !== undefined && this.matches(x.finalType);
	}

	*prototypeChain() {
		yield this.target;
		let proto = Object.getPrototypeOf(this.target);
		do {
			if (RESERVED_PROTOTYPES.has(proto)) {
				return;
			}
			yield proto;
		} while ((proto = Object.getPrototypeOf(proto)));
	}

	static isValidTarget(target: Function) {
		return !RESERVED_CONSTRUCTORS.has(target);
	}

	static is(value: any): value is TypeReference {
		return value instanceof TypeReference;
	}

	static createFromValue(value: any): TypeReference | undefined {
		// eslint-disable-next-line no-null/no-null
		if (isPred.object(value) && value !== null) {
			const proto = Object.getPrototypeOf(value);
			if (TypeReference.isValidTarget(proto.constructor)) {
				return new TypeReference(proto.constructor);
			}
		}
	}
}
