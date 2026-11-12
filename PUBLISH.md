# Publishing bTB-RISK Studio

Everything in this folder is the website. No build step.

## 1. Push to GitHub

Open PowerShell and run these, one block at a time.

```powershell
cd "$env:USERPROFILE\OneDrive - University College Dublin\Teagasc\bTB-RISK-repository\03_app"

git init -b main
git add .
git commit -m "bTB-RISK Studio: farm-to-fork QMRA decision-support tool"
git remote add origin git@github.com:TalariGopi/btb-risk-studio.git
git push -u origin main
```

If `git push` asks for a password or reports `Permission denied (publickey)`, you have no SSH
key set up. Use HTTPS instead:

```powershell
git remote set-url origin https://github.com/TalariGopi/btb-risk-studio.git
git push -u origin main
```

A browser window will open for GitHub sign-in the first time.

## 2. Turn on GitHub Pages

1. Open https://github.com/TalariGopi/btb-risk-studio/settings/pages
2. Under **Build and deployment**, set **Source** to `Deploy from a branch`
3. Set **Branch** to `main` and the folder to `/ (root)`
4. Click **Save**

Wait two to three minutes. The site appears at:

**https://talarigopi.github.io/btb-risk-studio/**

The `.nojekyll` file in this folder stops GitHub rewriting the directory, so leave it in place.

## 3. Later updates

```powershell
cd "$env:USERPROFILE\OneDrive - University College Dublin\Teagasc\bTB-RISK-repository\03_app"
git add .
git commit -m "describe the change"
git push
```

Pages redeploys within a minute or two.

## Alternative: Cloudflare Workers

`wrangler.toml` is configured to serve this folder. This gives the same style of URL as the
DETCON Listeria Risk Studio.

```powershell
npx wrangler@latest login
npx wrangler@latest deploy
```

Published at `https://btb-risk-studio.<your-subdomain>.workers.dev`.

## Citing the tool in the manuscript

Add to the Data availability or Methods section:

> The decision-support tool described here is freely available at
> https://talarigopi.github.io/btb-risk-studio/ and its source code at
> https://github.com/TalariGopi/btb-risk-studio.

For a permanent, citable DOI, link the GitHub repository to Zenodo
(https://zenodo.org/account/settings/github/) and create a release. Zenodo mints a DOI for that
release, which is the version to cite in the paper.
