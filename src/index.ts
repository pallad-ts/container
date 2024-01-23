import * as errors from "./errors";
import { Container } from "./Container";

export * from "./Definition";
export * from "./Container";

export * from "./args/ReferenceArg";
export * from "./args/ContainerArg";
export * from "./args/ConfigRequestArg";
export * from "./args/ResolveArg";
export * from "./args/TransformArg";

export * from "./types";
export * from "./reference";
export * from "./config";
export * from "./Lookup";
export * from "./createAnnotationFactory";
export * from "./TypeRef";

export * from "./middlewares/activation";
export * from "./middlewares/config";
export * from "./middlewares/deprecated";

export * from "./decorators/OnActivation";
export * from "./decorators/Config";
export * from "./decorators/Annotation";
export * from "./decorators/Inject";
export * from "./decorators/Deprecated";
export * from "./createContainer";

export { Service } from "./decorators/Service";

export { createNamespace, namespaceEntry } from "./createNamespace";

export { errors };
