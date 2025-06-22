import { E2BSandbox } from './wrappers/E2BSandbox.js';
import { DaytonaSandbox } from './wrappers/DaytonaSandbox.js';
import { CodeSandbox } from './wrappers/CodeSandbox.js';
import { BaseSandbox } from './wrappers/BaseSandbox.js';

const providerMap: Record<string, typeof BaseSandbox> = {
    'e2b': E2BSandbox,
    'daytona': DaytonaSandbox,
    'codesandbox': CodeSandbox
}

export type Provider = keyof typeof providerMap;
export const providers = Object.keys(providerMap);

export class Sandbox {
    static async create(provider: Provider) {
        return await providerMap[provider].create();
    }
    static async connect(provider: Provider, id: string) {
        return await providerMap[provider].connect(id);
    }
}