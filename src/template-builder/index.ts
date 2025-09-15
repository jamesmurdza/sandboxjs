import { E2BSandbox, E2BBuildOptions } from '../providers/e2b.js';
import { DaytonaSandbox, DaytonaBuildOptions } from '../providers/daytona.js';

export function buildTemplate(
  provider: 'e2b',
  directory: string,
  name: string,
  options?: E2BBuildOptions & {
    onLogs?: (chunk: string) => void;
  }
): Promise<void>;

export function buildTemplate(
  provider: 'daytona',
  directory: string,
  name: string,
  options?: DaytonaBuildOptions & {
    onLogs?: (chunk: string) => void;
  }
): Promise<void>;

export async function buildTemplate(
  provider: string,
  directory: string,
  name: string,
  options?: any
): Promise<void> {
  switch (provider) {
    case 'e2b':
      return await E2BSandbox.buildTemplate(directory, name, options);
    case 'daytona':
      return await DaytonaSandbox.buildTemplate(directory, name, options);
    default:
      throw new Error(`Template building not supported for provider: ${provider}`);
  }
}