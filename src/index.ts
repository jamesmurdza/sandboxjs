import * as providers from "./providers/index.js";
import { registerProvider } from "./registry.js";

registerProvider("e2b", providers.E2BSandbox);
registerProvider("daytona", providers.DaytonaSandbox);
registerProvider("codesandbox", providers.CodeSandboxSandbox);
registerProvider("modal", providers.ModalSandbox);
registerProvider("beam", providers.BeamSandbox);

export { Sandbox, CreateSandboxOptions, RunCommandOptions } from "./sandbox.js";
export { buildTemplate } from "./template-builder/index.js";
export { providers };
