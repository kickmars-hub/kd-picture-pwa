Picture Description Check PWA
=============================

1. Put these files in one web folder.
2. Put your 15 PNG files in the SAME folder with these exact names:
   PIC01KD.png ... PIC15KD.png
3. Edit Answer.csv.

CSV format:
No,Answer1,Answer2
1,"The boy is playing soccer.","A boy is playing soccer."
2,"She bought a bag in Tokyo.",
...

- Answer2 may be blank.
- You can add Answer3, Answer4, etc. if needed; app.js accepts all columns after No.
- If an answer contains a comma, keep it inside double quotation marks.

Important for iPad/PWA:
- Do NOT open index.html directly from the Files app using file://.
- Host the folder on an HTTPS website (GitHub Pages, Netlify, Cloudflare Pages, school web server, etc.).
- Open the HTTPS URL in Safari, tap Share, then "Add to Home Screen".

AI checking:
- Exact CSV answers work without any AI.
- When the answer is not an exact CSV match, app.js tries POST /api/check.
- If /api/check does not exist, the app falls back to local similarity/difference checking.
- Never put an AI API key in app.js; students could extract it.

Offline use:
- After the first successful load, the service worker caches the app, CSV, and images.
- AI semantic judging still needs network access to your server/API.
