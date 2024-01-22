import { Hook, onActivation } from "../";
import { Annotation } from "./Annotation";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function OnActivation(hook: Hook) {
	return (target: any) => {
		Annotation(onActivation(hook))(target);
	};
}
