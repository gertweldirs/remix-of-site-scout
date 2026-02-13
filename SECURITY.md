# 🔐 Security & Environment Setup

## Environment Variables

### Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your credentials:**
   - Get Supabase keys from: https://supabase.com/dashboard/project/_/settings/api
   - Add any API keys from your integrations
   - **NEVER commit `.env` or `.env.local`**

### Public vs Private Keys

- **VITE_*** (Browser) - Safe to expose, anon/public keys
- **Non-VITE** (Server-only) - NEVER commit, set in `.env.local` or GitHub Secrets

### Current Keys

| Key | Location | Public? | Details |
|-----|----------|---------|---------|
| `VITE_SUPABASE_PROJECT_ID` | `.env` | ✅ Safe | Project identifier |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` | ✅ Safe | Anon JWT token |
| `VITE_SUPABASE_URL` | `.env` | ✅ Safe | API endpoint |
| `LOVABLE_API_KEY` | `.env.local` | ❌ SECRET | Keep in `.env.local` only |

## Security Protections in Place

### 1. Git Protection
- `.env` files ignored by `.gitignore`
- `.env.example` provided as template
- Secret scanning on push via GitHub Actions

### 2. Pre-commit Hooks
- `husky` + `lint-staged` check commits
- Prevents accidental secret commits
- Run `npm install` to setup hooks

### 3. GitHub Actions
- Automatic secret scanning with TruffleHog
- Runs on push to main/develop
- Blocks PRs with exposed secrets

## If You Accidentally Committed a Secret

1. **IMMEDIATE:** Rotate/revoke that credential
2. **Remove from Git history:**
   ```bash
   git filter-branch --tree-filter 'rm -f .env' HEAD
   ```
3. **Force push (after review):**
   ```bash
   git push origin main --force
   ```
4. **Notify team** if credentials were exposed

## Deployment Secrets

Use GitHub Secrets for CI/CD:

```bash
# GitHub Secrets Setup
1. Settings → Secrets and variables → Actions
2. Add: LOVABLE_API_KEY
3. Add: SUPABASE_SERVICE_ROLE_KEY (if needed)
4. Reference in workflows: ${{ secrets.LOVABLE_API_KEY }}
```

## Checklist for Commits

Before `git push`, verify:
- [ ] No `.env` file staged
- [ ] No API keys in code
- [ ] No database passwords visible
- [ ] No auth tokens in strings
- [ ] Used environment variables instead

## More Reading

- [Supabase Security Best Practices](https://supabase.com/docs/guides/security)
- [OWASP: Secrets Management](https://owasp.org/www-community/Secrets_Exposure)
- [GitHub: Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
