import { Sandbox } from "./sandbox.js";
import * as providers from "./providers/index.js";
import { registerProvider } from "./registry.js";

registerProvider("e2b", providers.E2BSandbox);
registerProvider("daytona", providers.DaytonaSandbox);
registerProvider("codesandbox", providers.CodeSandboxSandbox);

export { Sandbox };
