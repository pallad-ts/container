import { ensureMetadata } from "../serviceMetadata";
import { getDefinitionForClass } from "./ServiceNoAutoRegister";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Annotation(annotation: any): ClassDecorator {
	return (clazz: Function) => {
		const definition = getDefinitionForClass(clazz);
		if (definition) {
			definition.annotate(annotation);
		}
		ensureMetadata(clazz).annotations.push(annotation);
	};
}
