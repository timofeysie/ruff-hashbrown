# Git Workflow for Forked Repository

This repository is a fork of the original hashbrown repository. The workflow is set up to:
- Push your changes to your own GitHub repo (`origin`)
- Pull updates from the original repository (`upstream`)

## Remote Configuration

- **`upstream`**: The original repository (`https://github.com/liveloveapp/hashbrown.git`)
- **`origin`**: Your fork (`https://github.com/timofeysie/ruff-hashbrown.git`)

## Branch Strategy

- **`main`**: Tracks `upstream/main` (original repository's main branch)
- **`develop`**: Your development branch with your changes

## Common Workflows

### Push Your Develop Branch to Your Repo

```bash
# Make sure you're on the develop branch
git checkout develop

# Push to your repo (origin)
git push origin develop

# Or set upstream tracking for future pushes
git push -u origin develop
```

### Pull Updates from Original Repository's Main Branch

```bash
# Fetch latest changes from upstream
git fetch upstream

# Option 1: Update your local main branch to match upstream/main
git checkout main
git pull upstream main

# Option 2: Merge upstream/main into your develop branch
git checkout develop
git merge upstream/main

# After merging, push your updated develop branch
git push origin develop
```

### Complete Workflow: Sync Develop with Upstream Main

```bash
# 1. Fetch latest from upstream
git fetch upstream

# 2. Switch to develop branch
git checkout develop

# 3. Merge upstream/main into develop
git merge upstream/main

# 4. Resolve any merge conflicts if they occur
# (edit files, then: git add . && git commit)

# 5. Push updated develop to your repo
git push origin develop
```

### View Remote Configuration

```bash
# List all remotes
git remote -v

# View remote branches
git branch -r
```

### Verify Remote Configuration

Check that your remotes are correctly configured:

```bash
git remote -v
```

You should see:
- `origin` pointing to your repo: `https://github.com/timofeysie/ruff-hashbrown.git`
- `upstream` pointing to the original repo: `https://github.com/liveloveapp/hashbrown.git`

**Note**: If you see both remotes already configured (as shown above), no setup is needed. The configuration is already correct.

## Troubleshooting

### Push Rejected Due to Secrets (GH013 Error)

If you see an error like this when pushing:

```
remote: error: GH013: Repository rule violations found for refs/heads/develop.
remote: - GITHUB PUSH PROTECTION
remote:   - Push cannot contain secrets
remote:   - OpenAI API Key
remote:     locations:
remote:       - commit: dcf21188ef20155242693a738393b80ae43763d3
remote:         path: .env:1
```

This means there's a secret (API key) in your commit history. You need to remove it before pushing:

1. **Remove the `.env` file from git history:**
   ```bash
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env' --prune-empty --tag-name-filter cat -- --all
   ```

2. **Clean up the repository:**
   ```bash
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

3. **Force push (use with caution):**
   ```bash
   git push -u origin develop --force
   ```

**Important Notes:**
- Force pushing rewrites history. Only do this if you're the only one working on this branch.
- The `.env` file should already be in `.gitignore` to prevent this in the future.
- After removing the secret, make sure your local `.env` file contains only placeholder values or is excluded from commits.

### Alternative: Use GitHub's Secret Allowlist (Not Recommended)

If the secret is no longer valid/used, you can temporarily allow it through GitHub's interface using the URL provided in the error message. However, **removing it from history is the recommended approach**.

