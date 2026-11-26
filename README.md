# Ahmed Salama - AUC digital business card

Static site (HTML, CSS, vanilla JS). Works on GitHub Pages, no build step, no paid services.

## Publish
1. Create a repo named `auc-card` under your GitHub account (public).
2. Upload the CONTENTS of this folder to the repo root (index.html must be at the top level, not inside a sub-folder).
3. Settings > Pages > Deploy from a branch > main > / (root) > Save.
4. The card goes live at https://ahsalama74.github.io/auc-card/

## Edit details
- `config.js`: name, title, program, department, phone, email, website, LinkedIn. Leave a value as "" to hide its button.
- `ahmed-salama.vcf`: the contact file phones save. Keep it in step with config.js.
- `index.html`: the <title> and og:/twitter: tags (link previews cannot read config.js). Update them by hand.
- If the card moves to another address, change `cardUrl` in config.js and the URLs in the meta tags, then replace the QR files.

## Not yet confirmed
- Website button: points to the AUC Executive Education page. Change it in config.js and the vCard if needed.
- AUC approval for logo, name and title use.

## QR code
Built in the page (qrcode-generator, MIT). Download PNG (about 3000 px) or SVG from the card. The AUC mark in the center can be switched off with the checkbox.
