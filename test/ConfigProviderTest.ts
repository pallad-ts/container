import { configProviderFromObject } from "@src/ConfigProvider";
import { ConfigArgument } from "@src/arguments/ConfigArgument";

describe("configProviderForObject", () => {
	const provider = configProviderFromObject({
		foo: "bar",
		nested: {
			foo: "zar",
			nested2: {
				foo: "car",
			},
		},
	});

	const DEFAULT = "defaultValue";

	it("getting by simple path", () => {
		expect(provider(new ConfigArgument("foo"))).toEqual("bar");
		expect(provider(new ConfigArgument("foo", DEFAULT))).toEqual("bar");
		expect(provider(new ConfigArgument("bar", DEFAULT))).toEqual(DEFAULT);
	});

	it("getting at nested path", () => {
		expect(provider(new ConfigArgument("nested.foo"))).toEqual("zar");
		expect(provider(new ConfigArgument("nested.foo", DEFAULT))).toEqual("zar");
		expect(provider(new ConfigArgument("nested.bar", DEFAULT))).toEqual(DEFAULT);
	});

	it("getting as double nested path", () => {
		expect(provider(new ConfigArgument("nested.nested2.foo"))).toEqual("car");
		expect(provider(new ConfigArgument("nested.nested2.foo", DEFAULT))).toEqual("car");
		expect(provider(new ConfigArgument("nested.nested2.bar", DEFAULT))).toEqual(DEFAULT);
	});

	it("fails if config not defined and no default value set", () => {
		expect(() => {
			provider(new ConfigArgument("bar"));
		}).toThrowError(/Config at path "bar" is not defined/);
	});
});
