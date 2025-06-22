import { E2BSandbox } from "./e2b.js";
import { DaytonaSandbox } from "./daytona.js";
import { CodeSandboxSandbox } from "./codesandbox.js";
import { Sandbox } from "../sandbox.js";

export const providerRegistry: Record<string, new () => Sandbox> = {
  e2b: E2BSandbox,
  daytona: DaytonaSandbox,
  codesandbox: CodeSandboxSandbox,
};
export type Provider = keyof typeof providerRegistry;
export const providers = Object.keys(providerRegistry);
