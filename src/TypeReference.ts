import * as isPred from "predicates";
import { ClassConstructor, DefinitionPredicate } from "./types";

const reservedConstructors = new Set<Function>(
	["Function", "Object", "Promise"].map(x => (global as any)[x]).filter(x => x)
);

export class TypeReference {
	constructor(private target: Function) {
		if (!TypeReference.isValidTarget(target)) {
			throw new Error(`Target ${target} is invalid`);
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

	static isValidTarget(target: Function) {
		return !reservedConstructors.has(target);
	}

	static is(value: any): value is TypeReference {
		return value instanceof TypeReference;
	}

	static createFromClass(type: ClassConstructor<any>): TypeReference | undefined {
		if (TypeReference.isValidTarget(type)) {
			return new TypeReference(type);
		}
	}

	static createFromValue(value: any) {
		// eslint-disable-next-line no-null/no-null
		if (isPred.object(value) && value !== null) {
			const proto = Object.getPrototypeOf(value);
			if (TypeReference.isValidTarget(proto.constructor)) {
				return new TypeReference(proto.constructor);
			}
		}
	}

	static predicateForClass(type: ClassConstructor<any>): DefinitionPredicate | undefined {
		const ref = TypeReference.createFromClass(type);
		if (ref) {
			return ref.predicate;
		}
	}
}
