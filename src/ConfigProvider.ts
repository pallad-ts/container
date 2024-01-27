import * as objectPath from "object-path";
import { ERRORS } from "./errors";
import { ConfigArgument } from "./arguments/ConfigArgument";

export function configProviderFromObject(config: object): ConfigProvider {
	return (request: ConfigArgument<any>) => {
		const result = objectPath.get(config, request.path);

		if (result === undefined) {
			if (request.hasDefaultValue) {
				return request.defaultValue;
			}
			throw ERRORS.MISSING_CONFIG_VALUE.create(request.path);
		}
		return result;
	};
}

/**
 * Returns config value at given request path.
 *
 * Throws an error if default value is not defined and value at given path does not exist
 *
 * If value is not defined returns default value from request
 */
export interface ConfigProvider {
	(request: ConfigArgument<any>): any;
}
