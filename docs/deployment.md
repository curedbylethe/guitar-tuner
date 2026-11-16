# GitHub Pages

The repository is intended to be `curedbylethe/guitar-tuner`. Vite's base is
`/guitar-tuner/`; changing the repository name requires changing that base.
Builds contain only static files. Opening index.html with file:// cannot start
microphone input; HTTPS (or localhost during development) is required.

## First deployment

After the complete source is pushed to `main`:

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Source: GitHub Actions**.
3. Open **Actions → Validate → Run workflow**, select `main`, and run it.
   Review the typecheck, unit, production build and all 39 browser results.
4. Open **Actions → Deploy GitHub Pages → Run workflow**, select `main`, and run.
   This workflow repeats all checks, uploads dist and deploys the verified artifact.
5. Open the URL reported by the `github-pages` environment/deploy job. With the
   intended owner/name, it will be `https://curedbylethe.github.io/guitar-tuner/`.
6. Grant microphone permission on the site and perform the manual audio checks in
   testing.md. No secrets or additional services are needed.

Both workflows are manually runnable. Validation also runs on pull requests;
neither workflow runs on intermediate development pushes. Pages rejects non-main
refs via a job condition. Build jobs have read access; only the deployment job gets
`pages: write` and `id-token: write`. Repository administration is never modified.

## Enable automatic deployments later

Only after review, replace the Pages trigger with:

```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
```

Keep the main-ref condition, verification gate, artifact and official Pages actions.
This is documentation only; the checked-in workflow remains dispatch-only.

## If repository creation is unavailable

The delivery archive includes source plus a `guitar-tuner.bundle` containing every
incremental commit. Restore the actual history, then create and push the repository:

```sh
git clone guitar-tuner.bundle guitar-tuner-checkout
cd guitar-tuner-checkout
gh repo create curedbylethe/guitar-tuner --public --source=. --remote=origin --push
```

This assumes your own CLI is authenticated (`gh auth login` if needed). Alternatively
create an empty repository on GitHub without README/license/ignore initialization,
then `git remote add origin git@github.com:curedbylethe/guitar-tuner.git` and
`git push -u origin main`. Avoid uploading a ZIP through the web UI: that would
lose the staged commit history. No Pages deployment happens merely from this push.
