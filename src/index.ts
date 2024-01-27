import * as errors from "./errors";

export * from "./Definition";
export * from "./Container";

export * from "./arguments/ReferenceArgument";
export * from "./arguments/ContainerArgument";
export * from "./arguments/ConfigArgument";
export * from "./arguments/TransformArgument";

export * from "./types";
export * from "./reference";
export * from "./config";
export * from "./Lookup";
export * from "./createAnnotationFactory";
export * from "./TypeReference";

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
