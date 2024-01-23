import { Config } from "@src/decorators/Config";
import { Service } from "@src/decorators/Service";
import { ensureMetadataAttachedToClass } from "@src/serviceMetadata";
import { ConfigRequestArg } from "@src/args/ConfigRequestArg";

describe("Config", () => {
	it("injects parameter to constructor", () => {
		@Service()
		class Foo {
			constructor(
				@Config("path") readonly parameter: any,
				@Config("path2", "default") readonly parameter2: any
			) {}
		}

		const metadata = ensureMetadataAttachedToClass(Foo);
		expect(metadata.constructorArguments).toEqual([
			new ConfigRequestArg("path"),
			new ConfigRequestArg("path2", "default"),
		]);
	});

	it("injects parameters to property", () => {
		@Service()
		class Foo {
			@Config("path")
			property!: string;

			@Config("path2", "default")
			property2!: string;
		}

		const metadata = ensureMetadataAttachedToClass(Foo);
		expect(metadata.propertiesInjectors.get("property")).toEqual(new ConfigRequestArg("path"));

		expect(metadata.propertiesInjectors.get("property2")).toEqual(
			new ConfigRequestArg("path2", "default")
		);
	});
});
