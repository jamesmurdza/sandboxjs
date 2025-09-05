# Feature: Custom Template Support

## Requirements Summary

Allow users to pass custom templates when creating sandboxes across providers.

### Provider-Specific Template Support

- **E2B**: Uses `Sandbox.create(template, opts)` - template as first string parameter
- **Daytona**: Uses constructor with `CreateSandboxFromSnapshotParams.snapshot` property  
- **CodeSandbox**: Uses `CreateSandboxTemplateSourceOpts.id` for template ID
- **Modal**: Uses prefix-based routing (`aws/`, `gcp/`, `docker/`) with environment variable-based secret management

## Current Architecture Analysis

### Factory Pattern
```typescript
// Current: src/sandbox.ts
static async create(provider: string) {
  const Provider = getProvider(provider);
  const instance = new Provider();
  await instance.init();
  return instance;
}
```

### Provider Examples from Dependencies

**E2B Template Usage:**
```typescript
// From @node_modules/e2b/dist/index.d.ts
static create<S extends typeof Sandbox>(this: S, template: string, opts?: SandboxOpts): Promise<InstanceType<S>>;
```

**Daytona Template Usage:**  
```typescript
// From @node_modules/@daytonaio/sdk/src/Daytona.d.ts
create(params?: CreateSandboxFromSnapshotParams): Promise<Sandbox>;
// Where CreateSandboxFromSnapshotParams has:
snapshot?: string; // This is the template
```

**CodeSandbox Template Usage:**
```typescript  
// From @node_modules/@codesandbox/sdk/dist/esm/types.d.ts
type CreateSandboxTemplateSourceOpts = CreateSandboxBaseOpts & {
  source: "template";
  id?: string; // Template ID
};
```

**Modal Template Usage:**
```typescript
// From @node_modules/modal/dist/index.d.ts
imageFromRegistry(tag: string, secret?: Secret): Promise<Image>;
imageFromAwsEcr(tag: string, secret: Secret): Promise<Image>;
imageFromGcpArtifactRegistry(tag: string, secret: Secret): Promise<Image>;
```

## Design Decisions

### Template Parameter Design
- Add optional template parameter to `Sandbox.create()`
- Signature: `Sandbox.create(provider: string, options?: { template?: string })`
- Backward compatible - existing calls continue working
- Modal provider uses intelligent prefix routing for different registries

### Abstract Method Update
- Update abstract `init(id?: string)` to `init(id?: string, template?: string)` in base Sandbox class
- Maintain backward compatibility for existing `init(id)` calls

## Implementation Plan

### Phase 1: Update Base Class
1. Modify `Sandbox.create()` signature in `src/sandbox.ts`
2. Update abstract `init()` method to accept optional template parameter
3. Update factory logic to pass template parameter

### Phase 2: Provider Updates
1. E2B: Pass template directly to `Sandbox.create()`
2. Daytona: Set `snapshot` property in creation params
3. CodeSandbox: Set `id` in `CreateSandboxTemplateSourceOpts` 
4. Modal: Implement prefix-based routing with proper secret management
   - `aws/` prefix: Uses `MODAL_AWS_SECRET_NAME` environment variable
   - `gcp/` prefix: Uses `MODAL_GCP_SECRET_NAME` environment variable  
   - `docker/` prefix or no prefix: Uses optional `MODAL_DOCKER_SECRET_NAME`

### Phase 3: Integration Testing
1. Verify backward compatibility
2. Test template functionality per provider

## Environment Variables Required

### Modal Provider Additional Variables
When using Modal with custom templates from private registries:
- `MODAL_AWS_SECRET_NAME` - Required for `aws/` prefixed templates 
- `MODAL_GCP_SECRET_NAME` - Required for `gcp/` prefixed templates
- `MODAL_DOCKER_SECRET_NAME` - Optional for private Docker registry authentication

**Note**: You must first create these secrets in Modal before using them. See [Modal Secrets Documentation](https://modal.com/docs/guide/secrets#interact-with-secrets-from-the-command-line) for instructions on how to create and manage secrets via the command line.

## Success Criteria
- [x] `Sandbox.create("e2b", { template: "custom" })` works
- [x] `Sandbox.create("daytona", { template: "snapshot-id" })` works  
- [x] `Sandbox.create("codesandbox", { template: "template-id" })` works
- [x] `Sandbox.create("modal", { template: "node:18-alpine" })` works with Docker registry
- [x] `Sandbox.create("modal", { template: "docker/node:18-alpine" })` works with explicit prefix
- [x] `Sandbox.create("modal", { template: "aws/my-image" })` works with proper `MODAL_AWS_SECRET_NAME` env var
- [x] `Sandbox.create("modal", { template: "gcp/my-image" })` works with proper `MODAL_GCP_SECRET_NAME` env var
- [x] Modal throws descriptive errors when required environment variables are missing
- [x] `Sandbox.create("provider")` continues working (backward compatibility)

## Risk Assessment
- **Low Risk**: Optional parameter maintains backward compatibility
- **Provider Dependencies**: Each provider handles templates differently - abstracted away
- **Registry Support**: Modal supports multiple image registries with proper secret management
- **Environment Variables**: Clear error messages when required Modal secrets are not configured
