# BerylTerminal

A single-page trading dashboard UI — watchlist, live-updating mock chart, order ticket, order book/trade tape, and a PRO subscription upsell flow. Everything (markup, styles, and behavior) lives in one self-contained `index.html`; there's no build step and no backend — price data and trades are simulated client-side with `setInterval`, and the "Subscribe to PRO" flow is a front-end mock (it never sends card data anywhere).

## Running it

Just open `index.html` in a browser, or serve the folder statically:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying with GitHub Pages

1. Push this repo to GitHub (see below).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save — GitHub will publish `index.html` at `https://<username>.github.io/<repo>/`.

## Pushing to GitHub

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

(This project folder is already a git repo with an initial commit — just add your remote and push.)
