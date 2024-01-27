import { deprecated } from "../middlewares/deprecated";
import { Annotation } from "./Annotation";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Deprecated(deprecationNote: string): any {
	return function (target: any) {
		Annotation(deprecated(deprecationNote))(target);
	};
}
