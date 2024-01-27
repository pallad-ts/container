import { configMiddleware, getConfigProviderForContainer } from "@src/middlewares/config";
import { configProviderFromObject } from "@src/ConfigProvider";
import { ERRORS } from "@src/errors";
import "@pallad/errors-dev";
import { Container } from "@src/Container";

describe("config", () => {
	it("sets config provider on attach", () => {
		const container = new Container();
		const provider = configProviderFromObject({});
		const middleware = configMiddleware(provider);

		expect(() => {
			getConfigProviderForContainer(container);
		}).toThrowErrorWithCode(ERRORS.CONFIG_PROVIDER_NOT_ATTACHED);
		container.addMiddleware(middleware);

		expect(getConfigProviderForContainer(container)).toStrictEqual(provider);
	});
});
