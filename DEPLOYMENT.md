# 🚀 Deployment Guide - SiteInspector

## Live Deployment Status

Your site is configured for **automatic deployment** via GitHub Pages!

### Current Setup

- **Hosting:** GitHub Pages (free)
- **Auto-deploy:** On every push to `main` branch
- **Build:** Automatic via GitHub Actions
- **URL:** `https://gertweldirs.github.io/remix-of-site-scout`

---

## Quick Start: Publish to GitHub Pages

### Step 1: Enable GitHub Pages

1. Go to your repository settings:
   - GitHub → Settings → Pages
2. Under "Build and deployment":
   - Source: `Deploy from a branch`
   - Branch: `gh-pages` (will be created automatically)
   - Folder: `/ (root)`
3. Click **Save**

### Step 2: Push to GitHub

```bash
git add .
git commit -m "Setup deployment configuration"
git push origin main
```

### Step 3: GitHub Actions Will Deploy Automatically

1. Go to your repo → Actions
2. Watch the "Deploy to GitHub Pages" workflow run
3. Once complete (✅), your site is live!

---

## Test Locally Before Pushing

```bash
# Build the project
npm run build

# Preview the production build locally
npm run preview
```

Then open: `http://localhost:4173`

---

## Environment Variables for Deployment

### GitHub Secrets Setup

For production (server-side) secrets that shouldn't be in `.env`:

1. Settings → Secrets and variables → Actions
2. Add these secrets:
   - `LOVABLE_API_KEY` - Your Lovable AI API key
   - `SUPABASE_SERVICE_ROLE_KEY` - If needed for server functions

### Use in GitHub Actions

```yaml
- name: Deploy
  env:
    LOVABLE_API_KEY: ${{ secrets.LOVABLE_API_KEY }}
  run: npm run build
```

---

## Custom Domain Setup (Optional)

To use a custom domain (e.g., `yoursite.com`):

1. In your GitHub repo → Settings → Pages
2. Under "Custom domain", enter: `yoursite.com`
3. GitHub will create a `CNAME` file
4. Go to your domain registrar → DNS settings
5. Add a CNAME record:
   ```
   CNAME record: yoursite.com → gertweldirs.github.io
   ```
6. Wait 5-30 minutes for DNS propagation

---

## Monitoring Deployments

### GitHub Actions Dashboard

- Repo → Actions tab
- View all deployment runs
- Check logs if something fails

### Deployment Logs

```bash
# Check if build script works
npm run build

# Test production preview
npm run preview
```

---

## Performance & Optimization

### Current Build Stats

```
JavaScript chunks: ~1.5 MB (gzipped: ~450 KB)
CSS: ~72 KB (gzipped: ~12 KB)
Total: ~1.6 MB (gzipped: ~463 KB)
```

### If You Need to Reduce Bundle Size

1. **Lazy load components:**
   ```typescript
   const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
   ```

2. **Remove unused dependencies:**
   ```bash
   npm ls --depth=0  # List all dependencies
   npm prune         # Remove unused packages
   ```

3. **Analyze bundle:**
   ```bash
   npm install --save-dev rollup-plugin-visualizer
   ```

---

## Troubleshooting

### Site not updating?

1. Clear browser cache (Ctrl+Shift+Delete)
2. Check GitHub Actions workflow status
3. Verify `.env` files are not committed (check `.gitignore`)

### Build fails?

1. Check GitHub Actions logs
2. Run locally: `npm run build`
3. Fix any errors and push again

### 404 errors on sub-routes?

1. Ensure React Router is configured
2. Add `_redirects` file:
   ```
   /* /index.html 200
   ```

---

## Next Steps

- [ ] Enable GitHub Pages in settings
- [ ] Push changes to `main` branch
- [ ] Watch Actions workflow complete
- [ ] Visit your live site URL
- [ ] Share with your team! 🎉

---

## Support

For deployment issues, check:
- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [GitHub Actions Status](https://www.githubstatus.com)
