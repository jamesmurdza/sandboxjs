import type { Sandbox } from "./sandbox.js";

type ProviderConstructor = new () => Sandbox;
const providers: Record<string, ProviderConstructor> = {};

export function registerProvider(name: string, provider: ProviderConstructor) {
  providers[name] = provider;
}

export function getProvider(name: string): ProviderConstructor {
  if (!providers[name]) {
    throw new Error(`Provider ${name} not found`);
  }
  return providers[name];
}

export function listProviders(): string[] {
  return Object.keys(providers);
}
