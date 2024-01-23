import { ensureMetadataAttachedToClass } from "../classServiceMetadata";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Annotation(annotation: any): ClassDecorator {
	return (clazz: Function) => {
		ensureMetadataAttachedToClass(clazz).annotations.push(annotation);
	};
}
