# Wedding Website — Setup Guide

This is a plain HTML/CSS/JS site (no build step). RSVP and registry data are
stored in a Google Sheet, read and written through a small Google Apps
Script "Web App" that acts as your free backend.

## 1. Create the Google Sheet + backend

1. Create a new Google Sheet (e.g. "Wedding RSVPs & Registry") in your own
   Google account.
2. Open **Extensions → Apps Script**.
3. Delete the placeholder code and paste in the contents of
   [`apps-script/Code.gs`](apps-script/Code.gs).
4. Run the `setup` function once (select it from the function dropdown,
   click ▶ Run). Approve the permission prompts — this creates five tabs:
   `RSVP`, `Guests`, `RegistryItems`, `RegistryClaims`, `Funds`.
5. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, authorize again if asked, and copy the **Web app URL**
   (ends in `/exec`).
7. Paste that URL into [`assets/js/config.js`](assets/js/config.js) as
   `APPS_SCRIPT_URL`.

Whenever you edit `Code.gs` later, use **Deploy → Manage deployments → Edit
→ New version** so the live URL picks up the changes.

## 2. Add registry items

Open the `RegistryItems` tab in the Sheet and add one row per item:

| Column | Meaning |
|---|---|
| ID | Any unique text, e.g. `item-1` |
| Category | e.g. `Kitchen`, `Home`, `Experiences` — used for the filter chips |
| Name / Description | Shown on the card |
| ImageURL | A direct image link (see note below) |
| PriceMin / PriceMax | Same number twice for a fixed price, or a range |
| QtyNeeded | 1 for a one-off gift, or higher for things like "honeymoon fund, $50 x 10" |
| Link1Store / Link1Url (…2, …3) | Up to 3 buy-it links, e.g. Amazon, Crate & Barrel |
| Active | Leave blank or `Y`; set to `N` to hide an item without deleting it |

**Images:** the most reliable option is dropping image files into
`assets/img/registry/` in this project and using a relative path
(`assets/img/registry/dutch-oven.jpg`) once it's hosted. Google Drive
image links often get blocked from loading on other sites — avoid those.

Since this is just a spreadsheet, you can add/edit items from your phone,
tablet, or laptop via the Google Sheets app — no code needed.

### Syncing items from MyRegistry

Before running this, open `Code.gs` and set `MYREGISTRY_URL` near the top
to your public MyRegistry gift list link.

Reload the Google Sheet (refresh the browser tab) and a **Wedding Site**
menu appears next to Help. Click **Wedding Site → Sync MyRegistry Now**
any time you've added or changed items on MyRegistry, and it pulls them
into `RegistryItems` automatically — name, price, image, and how many are
still needed, tagged with `Source = MyRegistry`.

Those items show a **"Buy on MyRegistry"** button on your site instead of
the "I got this!" claim button, since the actual purchase happens on
MyRegistry — this keeps the two systems from disagreeing about what's
left. The "still needed" count updates the next time you click Sync.

This isn't an official MyRegistry API (they don't offer one) — it reads
structured data MyRegistry embeds in the page for search engines. It's
been verified against your live list, but if MyRegistry redesigns their
site this could stop working; you'll get a clear error in the sync dialog
if so, rather than silently wrong data.

## 3. Cash funds (honeymoon, baby fund, etc.)

Open the `Funds` tab and add one row per fund:

| Column | Meaning |
|---|---|
| ID | Any unique text, e.g. `honeymoon` |
| Name / Description | Shown on the fund card |
| Goal | Target amount, e.g. `2000` |
| AmountRaised | How much you've received so far — **you update this by hand** |
| ImageURL | A direct image link, same guidance as registry items |
| VenmoLink | Your Venmo profile link, e.g. `https://venmo.com/u/your-handle` |
| Active | Leave blank or `Y`; set to `N` to hide a fund without deleting it |

Each fund shows as a card with a progress bar on the Registry page. Venmo
has no API for reading payments, so **the progress bar only moves when you
update the AmountRaised number** — there's no way to make it update itself
automatically without switching to a paid processor like Stripe, which
would bring back the transaction fees you're trying to avoid. Check your
Venmo activity periodically and update the Sheet; guests always see
whatever number is currently there.

Add as many funds as you like (honeymoon, baby fund, new home, etc.) —
each row is its own card.

## 4. Who claimed what (for thank-you notes)

For items you added directly in the Sheet (not synced from MyRegistry):

Every claim (guest clicking "I got this!") logs a row in the
`RegistryClaims` tab with the item ID, name, and email. Cross-reference
against `RegistryItems` to see who got what.

## 5. Host the site for free

Any static host works. Easiest options:

**Netlify (drag and drop):**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag this whole project folder into the browser
3. You'll get a free `*.netlify.app` URL immediately (can add a custom
   domain later)

**GitHub Pages:**
1. Create a new GitHub repo and push this folder to it
2. Repo Settings → Pages → set source to the `main` branch
3. Your site is live at `https://<username>.github.io/<repo>`

## 6. Content still to fill in

Text wrapped in `[brackets]` throughout `index.html`, `details.html`,
`rsvp.html`, and `registry.html` is placeholder — names, date, venue,
schedule, attire, and travel info. Send those details back and they can
be dropped in, or edit the bracketed text directly in each HTML file.
