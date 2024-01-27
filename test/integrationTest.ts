import { Container } from "@src/Container";
import { configMiddleware } from "@src/middlewares/config";
import { configProviderFromObject } from "@src/ConfigProvider";
import { activationMiddleware } from "@src/middlewares/activation";
import { Config } from "@src/decorators/Config";
import { Service } from "@src/decorators/Service";
import { Inject } from "@src/decorators/Inject";
import { config } from "@src/config";
import { reference } from "@src/reference";
import { extractDefinitionFromClass } from "@src/classServiceMetadata";

describe("integration", () => {
	const CONFIG = {
		database: "mongo://localhost/test",
		redis: {
			user: "username",
			password: "$secretPa##W0rd",
			host: "my.redis.example.com",
			port: "8017",
		},
		env: process.env,
	};

	let container: Container;

	const extraService = { foo: "bar" };

	beforeEach(() => {
		container = new Container();

		container.addMiddleware(configMiddleware(configProviderFromObject(CONFIG)));
		container.addMiddleware(activationMiddleware);

		container.definitionWithValue("extraService", extraService);
	});

	it("service via decorators", async () => {
		@Service()
		class Foo {
			@Config("redis")
			redis: any;

			constructor(
				@Config("database") public mongo: string,
				@Inject("extraService") public extraService: any
			) {}
		}

		container.registerDefinition(extractDefinitionFromClass(Foo));
		const service = await container.resolve<Foo>(extractDefinitionFromClass(Foo).name);

		expect(service.mongo).toEqual(CONFIG.database);

		expect(service.redis).toEqual(CONFIG.redis);

		expect(service.extraService).toEqual(extraService);

		expect(service).toBeInstanceOf(Foo);
	});

	it("manually created service", async () => {
		container
			.definitionWithFactory(
				"Foo",
				(redis: any, extraService: any, requiresAuth: boolean) => {
					return {
						redis,
						extraService,
						requiresAuth,
					};
				}
			)
			.withArguments(
				config("redis"),
				reference("extraService"),
				config("requiresAuth", false)
			);

		const service = await container.resolve<any>("Foo");

		expect(service.redis).toEqual(CONFIG.redis);

		expect(service.extraService).toEqual(extraService);

		expect(service.requiresAuth).toEqual(false);
	});
});
