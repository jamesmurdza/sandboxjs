# Release Process

This document describes how to create a new release of @gitwit/sandbox.

## Prerequisites

1. **GitHub Repository Access**: You need write access to create tags and releases
2. **Set up secrets**:

   - `NPM_TOKEN` - NPM access token for publishing
   - `E2B_API_KEY` - For running tests
   - `DAYTONA_API_KEY` - For running tests

   > Make sure these secrets are configured in GitHub Settings > Secrets and variables > Actions

3. **Clean Working Directory**: Ensure all changes are committed and pushed

## Release Steps

### 1. Prepare the Release

1. **No Manual Version Updates Required**:

   - Version is automatically determined from git tags
   - `package.json` version is updated automatically during release workflow
   - Uses npm version command to sync with git tag

2. **Update CHANGELOG.md** (Optional - will be auto-generated):
   ```text
   # Add release notes to CHANGELOG.md under [Unreleased] section
   # Move items from [Unreleased] to new version section if needed
   ```

### 2. Create and Push Tag

```bash
# Create annotated tag
git tag -a v1.2.3 -m "Release version 1.2.3"

# Push tag to trigger release workflow
git push origin v1.2.3
```

### 3. Monitor Release Process

1. **GitHub Actions**: Watch the release workflow at `https://github.com/your-org/sandboxjs/actions`
2. **Verify Steps**:
   - ✅ Package builds successfully
   - ✅ Tests pass
   - ✅ Changelog generates
   - ✅ GitHub release created
   - ✅ NPM package published

### 4. Post-Release Verification

1. **Check GitHub Release**: Visit `https://github.com/your-org/sandboxjs/releases`
2. **Verify NPM**: Check `https://www.npmjs.com/package/@gitwit/sandbox`
3. **Test Installation**:
   ```bash
   npm install @gitwit/sandbox@1.2.3
   node -e "console.log(require('@gitwit/sandbox/package.json').version)"
   ```

## Automated Workflow Details

The GitHub Action (`release.yml`) automatically:

1. **Triggers on**: Tag push matching `v*.*.*` pattern
2. **Dynamic Versioning**: Automatically sets version from git tag using npm version
3. **Builds Package**: Uses `npm run build` to compile TypeScript to dist/
4. **Runs Tests**: Executes test suite with provider API keys
5. **Publishes to NPM**: Using `npm publish`
6. **Generates Changelog**: Auto-generates from PR titles and labels
7. **Creates GitHub Release**: With changelog and distribution files

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (`1.0.0`): Breaking changes
- **MINOR** (`0.1.0`): New features (backward compatible)
- **PATCH** (`0.0.1`): Bug fixes (backward compatible)

## Troubleshooting

### Release Workflow Fails

1. **Build Fails**: Check TypeScript compilation errors in `npm run build`
2. **Tests Fail**: Check provider API keys in repository secrets
3. **NPM Upload Fails**:
   - Verify `NPM_TOKEN` secret is set
   - Check if version already exists on NPM
   - Ensure package name is available

### Tag Already Exists

```bash
# Delete local tag
git tag -d v1.2.3

# Delete remote tag
git push --delete origin v1.2.3

# Recreate with new commit
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3
```

## Emergency Rollback

If a release has critical issues:

1. **Deprecate NPM Version** (if published):

   ```bash
   npm deprecate @gitwit/sandbox@1.2.3 "Critical issue - use 1.2.2 instead"
   ```

2. **Mark GitHub Release as Pre-release**:

   - Go to GitHub Releases
   - Edit the problematic release
   - Check "This is a pre-release"

3. **Create Hotfix Release**:
   - Fix the issue
   - Follow normal release process with patch version

## Changelog Labels

The automated changelog groups PRs by labels:

- `feature`, `enhancement`, `feat` → 🚀 Features
- `bug`, `fix`, `bugfix` → 🐛 Bug Fixes
- `documentation`, `docs` → 📚 Documentation
- `maintenance`, `refactor`, `chore` → 🔧 Maintenance
- `security` → 🔒 Security
- `performance`, `perf` → ⚡ Performance
- `test`, `testing` → 🧪 Testing
- `dependency`, `dep` → 📦 Dependencies

Use these labels on PRs for better changelog organization.
