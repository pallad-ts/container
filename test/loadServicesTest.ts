import { create, loadServices, Container, Service } from "@src/index";
import * as path from "path";

describe("loadServices", () => {
	const ROOT_DIR = path.resolve(__dirname, "./fixtures/loadServices");
	let container: Container;
	beforeEach(() => {
		container = create();
		Service.useContainer(container);
	});

	it("basic example", () => {
		jest.isolateModules(() => {
			require('@src/decorators/Service').Service.useContainer(container);
			loadServices(container, {
				currentDir: ROOT_DIR,
			});
		});

		expect(container.findDefinitionByName("NestedExample")).toBeDefined();
		expect(container.findDefinitionByName("Example")).toBeDefined();
		expect(container.findDefinitionByName("Example2")).toBeDefined();
		expect(container.findDefinitionByName("JSExample")).toBeDefined();
		expect(container.findDefinitionByName("TSXExample")).toBeDefined();
	});

	it("pattern", () => {
		jest.isolateModules(() => {
			require('@src/decorators/Service').Service.useContainer(container);
			loadServices(container, {
				currentDir: ROOT_DIR,
				patterns: ["./Example.*"],
			});
		});

		expect(container.findDefinitionByName("NestedExample")).not.toBeDefined();
		expect(container.findDefinitionByName("Example")).toBeDefined();
		expect(container.findDefinitionByName("Example2")).not.toBeDefined();
		expect(container.findDefinitionByName("JSExample")).not.toBeDefined();
		expect(container.findDefinitionByName("TSXExample")).not.toBeDefined();
	});

	it("with extension filter", () => {
		jest.isolateModules(() => {
			require('@src/decorators/Service').Service.useContainer(container);
			loadServices(container, {
				currentDir: ROOT_DIR,
				extensions: ["tsx"],
			});
		});

		expect(container.findDefinitionByName("NestedExample")).not.toBeDefined();
		expect(container.findDefinitionByName("Example")).not.toBeDefined();
		expect(container.findDefinitionByName("Example2")).not.toBeDefined();
		expect(container.findDefinitionByName("JSExample")).not.toBeDefined();
		expect(container.findDefinitionByName("TSXExample")).toBeDefined();
	});
});
