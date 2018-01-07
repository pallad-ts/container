import {getDefinitionForClass, Service} from "../../src/decorators/Service";
import {assert} from 'chai';
import {Inject} from "../../src/decorators/Inject";
import {Reference} from "../../src/Reference";
import {Container} from "../../src/Container";
import {Annotation} from "../../src/decorators/Annotation";

describe('decorators', () => {
    it('simple service', () => {
        @Service('SomeService')
        class Test {

        }

        const definition = getDefinitionForClass(Test);
        assert.propertyVal(definition, 'name', 'SomeService');

        const result = definition.factory(...definition.args);
        assert.instanceOf(result, Test);
    });

    it('simple service without explicit name', () => {
        @Service()
        class TestFoo {

        }

        const definition = getDefinitionForClass(TestFoo);
        assert.propertyVal(definition, 'name', 'TestFoo');
    });

    it('service with injected args', () => {
        @Service()
        class Foo {
            constructor(@Inject('a') arg1: any) {

            }
        }

        const definition = getDefinitionForClass(Foo);
        assert.propertyVal(definition, 'name', 'Foo');
        assert.sameDeepMembers(definition.args, [
            Reference.one.name('a')
        ]);
    });

    it('Injecting advanced reference', () => {
        const ref = Reference.one.annotation(() => true);

        @Service()
        class Foo {
            constructor(@Inject(ref) arg1) {

            }
        }

        const definition = getDefinitionForClass(Foo);
        assert.sameMembers(definition.args, [ref]);
    });

    it('Inject accepts only string or object of ContainerArg class', () => {
        assert.throws(() => {
            @Service()
            class Foo {
                constructor(@Inject([]) arg1) {

                }
            }
        }, /@Inject argument must be a string that represents service name or an object of ContainerArg instance/);
    });

    it('service with injected args and properties', () => {
        @Service()
        class Foo {
            @Inject('bar')
            bar: any;

            constructor(@Inject('a') private arg1, @Inject('b') private arg2) {

            }
        }

        const definition = getDefinitionForClass(Foo);
        assert.propertyVal(definition, 'name', 'Foo');
        assert.sameDeepMembers(definition.args, [
            Reference.one.name('a'),
            Reference.one.name('b'),
            Reference.one.name('bar')
        ]);

        const result = definition.factory('a', 'b', 'bar');

        assert.instanceOf(result, Foo);
        assert.propertyVal(result, 'bar', 'bar');
        assert.propertyVal(result, 'arg1', 'a');
        assert.propertyVal(result, 'arg2', 'b');
    });

    it('service name cannot be empty', () => {
        assert.throws(() => {
            Service()(function () {
            });
        }, /Missing service name/);
    });

    it('fails if not all constructor arguments have @Inject decorators', () => {
        assert.throws(() => {
            @Service()
            class Foo {
                constructor(@Inject('a') arg1, arg2) {

                }
            }
        }, /Required constructor arguments: 2, provided: 1/);
    });

    it('fails it there is an argument, in the middle of other arguments, without @Inject decorator', () => {
        assert.throws(() => {
            @Service()
            class Foo {
                constructor(@Inject('a') arg1, arg2, @Inject('c') arg3) {

                }
            }
        }, /Missing @Inject decorator for argument at position "1"/)
    });

    describe('using container', () => {
        let container: Container;
        beforeEach(() => {
            container = new Container();
            Service.useContainer(container);
        });

        afterEach(() => {
            Service.useContainer(undefined);
        });

        it('set container via Service.useContainer()', () => {

            @Service()
            class Test {

            }

            assert.strictEqual(container.findByName('Test'), getDefinitionForClass(Test));
        });
    });

    it('Defining annotation', () => {
        const annotation1 = {name: 'test'}
        const annotation2 = {name: 'test2'};

        @Annotation(annotation1)
        @Annotation(annotation2)
        @Service()
        class Test {

        }

        const definition = getDefinitionForClass(Test);
        assert.sameMembers(definition.annotations, [annotation1, annotation2]);
    });

    it('defining annotation when @Service decorator is used first', () => {
        const annotation1 = {name: 'test'}
        const annotation2 = {name: 'test2'};

        @Service()
        @Annotation(annotation1)
        @Annotation(annotation2)
        class Test {

        }

        const definition = getDefinitionForClass(Test);
        assert.sameMembers(definition.annotations, [annotation1, annotation2]);
    })
});