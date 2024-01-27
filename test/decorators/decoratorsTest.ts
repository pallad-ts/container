import { Service } from "@src/decorators/Service";
import { Inject } from "@src/decorators/Inject";
import { Container } from "@src/Container";
import { Annotation } from "@src/decorators/Annotation";
import { TypeReference } from "@src/TypeReference";
import { extractDefinitionFromClass } from "@src/classServiceMetadata";
import { ReferenceArgument } from "@src/arguments/ReferenceArgument";
import { ERRORS } from "@src/errors";
import "@pallad/errors-dev";

describe("decorators", () => {
	it("simple service", () => {
		@Service("SomeService")
		class Test {}

		const definition = extractDefinitionFromClass(Test);
		expect(definition.name).toEqual("SomeService");

		const result = definition.factory(...definition.arguments);
		expect(result).toBeInstanceOf(Test);
	});

	it("simple service without explicit name", () => {
		@Service()
		class TestFoo {}

		const definition = extractDefinitionFromClass(TestFoo);
		expect(definition.name).toMatch(/^TestFoo.*/);
	});

	it("service with injected args", () => {
		@Service()
		class Foo {
			constructor(@Inject("a") readonly arg1: any) {}
		}

		const definition = extractDefinitionFromClass(Foo);
		expect(definition.name).toMatch(/^Foo.*/);

		expect(definition.arguments).toEqual([ReferenceArgument.one.name("a")]);
	});

	it("Injecting advanced reference", () => {
		const ref = ReferenceArgument.one.annotation((ann): ann is any => true);

		@Service()
		class Foo {
			constructor(@Inject(ref) readonly arg1: any) {}
		}

		const definition = extractDefinitionFromClass(Foo);

		expect(definition.arguments).toEqual([ref]);
	});

	it("injecting type ref", () => {
		class Bar {}

		const ref = TypeReference.createFromClass(Bar)!;

		@Service()
		class Foo {
			constructor(@Inject(ref) readonly prop: Bar) {}
		}

		const definition = extractDefinitionFromClass(Foo);
		expect(definition.arguments).toEqual([ReferenceArgument.one.type(ref)]);
	});

	it("Inject accepts only string or object of ContainerArg class", () => {
		expect(() => {
			@Service()
			class Foo {
				constructor(@Inject([] as any) readonly arg1: any) {}
			}
		}).toThrowErrorMatchingSnapshot();
	});

	it("service with injected args and properties", () => {
		@Service()
		class Foo {
			@Inject("bar")
			bar: any;

			constructor(
				@Inject("a") private arg1: any,
				@Inject("b") private arg2: any
			) {}
		}

		const definition = extractDefinitionFromClass(Foo);
		expect(definition.name).toMatch(/^Foo.*/);

		expect(definition.arguments).toEqual([
			ReferenceArgument.one.name("a"),
			ReferenceArgument.one.name("b"),
			ReferenceArgument.one.name("bar"),
		]);

		const result = definition.factory("a", "b", "bar");

		expect(result).toBeInstanceOf(Foo);

		expect(result.bar).toEqual("bar");

		expect(result.arg1).toEqual("a");

		expect(result.arg2).toEqual("b");
	});

	it("fails if not all constructor arguments have @Inject decorators", () => {
		expect(() => {
			@Service()
			class Foo {
				constructor(
					@Inject("a") readonly arg1: any,
					readonly arg2: unknown
				) {}
			}
		}).toThrowErrorWithCode(ERRORS.AUTO_WIRING_FAILED);
	});

	it("fails it there is an argument, in the middle of other arguments, without @Inject decorator", () => {
		expect(() => {
			@Service()
			class Foo {
				constructor(
					@Inject("a") readonly arg1: any,
					readonly arg2: any,
					@Inject("c") readonly arg3: any
				) {}
			}
		}).toThrowErrorWithCode(ERRORS.AUTO_WIRING_FAILED);
	});

	it("Defining annotation", () => {
		const annotation1 = { name: "test" };
		const annotation2 = { name: "test2" };

		@Annotation(annotation1)
		@Annotation(annotation2)
		@Service()
		class Test {}

		const definition = extractDefinitionFromClass(Test);
		expect(definition.annotations).toEqual([annotation2, annotation1]);
	});

	it("defining annotation when @Service decorator is used first", () => {
		const annotation1 = { name: "test" };
		const annotation2 = { name: "test2" };

		@Service()
		@Annotation(annotation1)
		@Annotation(annotation2)
		class Test {}

		const definition = extractDefinitionFromClass(Test);
		expect(definition.annotations).toEqual([annotation2, annotation1]);
	});

	describe("autowiring", () => {
		let container: Container;

		const NAME = "example";

		class Foo implements FooInterface {
			// tslint:disable-next-line:no-empty
			bonk() {}
		}

		interface FooInterface {
			bonk(): void;
		}

		class Bar {}

		beforeEach(() => {
			container = new Container();
			container.definitionWithConstructor("foo", Foo);
			container.definitionWithConstructor("bar", Bar);
		});

		it("simple", async () => {
			@Service(NAME)
			class Example {
				constructor(readonly foo: Foo) {}
			}

			container.loadDefinitionFromClass(Example);
			const service = await container.resolve<Example>(NAME);

			expect(service).toBeInstanceOf(Example);

			expect(service.foo).toBeInstanceOf(Foo);
		});

		it("with properties", async () => {
			@Service(NAME)
			class Example {
				@Inject()
				bar!: Bar;

				@Inject()
				foo!: Foo;
			}

			container.loadDefinitionFromClass(Example);
			const service = await container.resolve<Example>(NAME);

			expect(service.bar).toBeInstanceOf(Bar);
			expect(service.foo).toBeInstanceOf(Foo);
		});

		it("nothing to autowire", async () => {
			@Service(NAME)
			class Example {}

			container.loadDefinitionFromClass(Example);
			const service = await container.resolve<Example>(NAME);
			expect(service).toBeInstanceOf(Example);
		});

		describe("overwriting an argument", () => {
			it("with type reference", async () => {
				@Service(NAME)
				class Example {
					constructor(@Inject(Bar) readonly foo: Foo) {}
				}

				container.loadDefinitionFromClass(Example);
				const service = await container.resolve<Example>(NAME);

				expect(service.foo).toBeInstanceOf(Bar);
			});

			it("with explicit reference", async () => {
				@Service(NAME)
				class Example {
					constructor(@Inject("bar") readonly foo: Foo) {}
				}

				container.loadDefinitionFromClass(Example);

				const service = await container.resolve<Example>(NAME);
				expect(service.foo).toBeInstanceOf(Bar);
			});

			it("interface reference", async () => {
				@Service(NAME)
				class Example {
					constructor(@Inject(Foo) readonly foo: FooInterface) {}
				}

				container.loadDefinitionFromClass(Example);

				const service = await container.resolve<Example>(NAME);
				expect(service.foo).toBeInstanceOf(Foo);
			});
		});

		describe("fails", () => {
			it("could not autowire interfaces", () => {
				expect(() => {
					@Service(NAME)
					class Example {
						constructor(readonly foo: FooInterface) {}
					}

					container.loadDefinitionFromClass(Example);
				}).toThrowErrorMatchingSnapshot();
			});

			it("could not use @Inject without arg for arguments", () => {
				expect(() => {
					const Inj = Inject as any;

					@Service(NAME)
					class Example {
						constructor(@Inj() readonly arg: any) {}
					}

					container.loadDefinitionFromClass(Example);
				}).toThrowErrorMatchingSnapshot();
			});

			it("could not autowire union types", () => {
				expect(() => {
					@Service()
					class Example {
						constructor(readonly arg: Foo | Bar) {}
					}

					container.loadDefinitionFromClass(Example);
				}).toThrowErrorMatchingSnapshot();
			});

			it("multiple instances of same type", () => {
				container.definitionWithConstructor("another", Foo);

				@Service(NAME)
				class Example {
					constructor(readonly foo: Foo) {}
				}

				container.loadDefinitionFromClass(Example);
				return expect(container.resolve(NAME)).rejects.toThrowErrorWithCode(
					ERRORS.AMBIGUOUS_SERVICE
				);
			});

			it("explicit referencing reserved type", () => {
				expect(() => {
					@Service(NAME)
					class Example {
						constructor(@Inject(Object) readonly foo: Foo) {}
					}

					container.loadDefinitionFromClass(Example);
				}).toThrowErrorMatchingSnapshot();
			});
		});
	});
});
