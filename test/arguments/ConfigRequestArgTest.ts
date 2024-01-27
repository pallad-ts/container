import { config } from "@src/config";
import { configMiddleware } from "@src/middlewares/config";
import { configProviderFromObject } from "@src/ConfigProvider";
import { ConfigArgument, Container, ContainerArgument } from "@src/index";

describe("ConfigArgument", () => {
	const PATH = "at.path";

	it("is ContainerArg", () => {
		expect(new ConfigArgument(PATH)).toBeInstanceOf(ContainerArgument);
	});

	it("creating with default value", () => {
		const defaultValue = { foo: "bar" };
		const request = new ConfigArgument(PATH, defaultValue);

		expect(request).toMatchObject({
			path: PATH,
			hasDefaultValue: true,
			defaultValue,
		});

		expect(Object.isFrozen(request)).toBe(true);
	});

	it("creating without default value", () => {
		const request = new ConfigArgument(PATH);

		expect(request).toMatchObject({
			path: PATH,
			hasDefaultValue: false,
			defaultValue: undefined,
		});

		expect(Object.isFrozen(request)).toBe(true);
	});

	it("path cannot be empty", () => {
		expect(() => {
			// tslint:disable-next-line:no-unused-expression
			new ConfigArgument("  ");
		}).toThrowError(/Config "path" cannot be blank/);
	});

	it("undefined as default value", () => {
		const request = new ConfigArgument(PATH, undefined);

		expect(request).toMatchObject({
			path: PATH,
			hasDefaultValue: true,
			defaultValue: undefined,
		});
	});

	it("ConfigRequestArg.create", () => {
		expect(ConfigArgument.create("path")).toEqual(new ConfigArgument("path"));

		expect(ConfigArgument.create("path", "withDefaultValue")).toEqual(
			new ConfigArgument("path", "withDefaultValue")
		);

		expect(ConfigArgument.create("path", undefined)).toEqual(
			new ConfigArgument("path", undefined)
		);
	});

	describe("as argument", () => {
		const REQUEST = config("foo");
		const MIDDLEWARE = configMiddleware(configProviderFromObject({ foo: "bar" }));

		let container: Container;
		beforeEach(() => {
			container = new Container();
		});

		it("resolves to config", () => {
			container.addMiddleware(MIDDLEWARE);
			return expect(REQUEST.resolve(container)).resolves.toEqual("bar");
		});

		it("has no dependencies", () => {
			container.addMiddleware(MIDDLEWARE);
			expect(REQUEST.dependencies()).toEqual([]);
		});
	});
});
