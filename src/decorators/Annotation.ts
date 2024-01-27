import { ensureMetadataAttachedToClass } from "../classServiceMetadata";
import { ClassConstructor } from "../types";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Annotation(annotation: any): ClassDecorator {
	return (clazz: Function) => {
		ensureMetadataAttachedToClass(clazz as ClassConstructor<any>).annotations.push(annotation);
	};
}
