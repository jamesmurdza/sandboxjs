import { E2BSandbox } from './wrappers/E2BSandbox.js';
import { DaytonaSandbox } from './wrappers/DaytonaSandbox.js';
import { CodeSandbox } from './wrappers/CodeSandbox.js';
import { BaseSandbox } from './wrappers/BaseSandbox.js';

const providerMap: Record<string, new () => BaseSandbox> = {
    'e2b': E2BSandbox,
    'daytona': DaytonaSandbox,
    'codesandbox': CodeSandbox
}

export type Provider = keyof typeof providerMap;
export const providers = Object.keys(providerMap);

export class Sandbox {
    static async create(provider: Provider) {
        const instance = new providerMap[provider]();
        await instance.initialize();
        return instance;
    
    }
    static async connect(provider: Provider, id: string) {
        const instance = new providerMap[provider]();
        await instance.initialize(id);
        return instance;
    }
}