/**
 * Wedding site backend — Google Apps Script Web App.
 * Handles RSVP submissions and registry reads/claims against this
 * spreadsheet. See README.md in this folder for deployment steps.
 *
 * Run `setup()` once from the Apps Script editor (Run > setup) to create
 * the required sheet tabs with headers.
 *
 * MyRegistry sync: once deployed, a "Wedding Site" menu appears in the
 * Google Sheet with a "Sync MyRegistry Now" item. Click it any time you've
 * added items to your MyRegistry list to pull them into RegistryItems.
 * This reads the public JSON-LD data MyRegistry embeds in your gift list
 * page for search engines — it's not an official/documented API, so if
 * MyRegistry changes that markup this could stop working; you'll see an
 * error in the sync dialog if so.
 */

var SHEET_RSVP = "RSVP";
var SHEET_GUESTS = "Guests";
var SHEET_REGISTRY_ITEMS = "RegistryItems";
var SHEET_REGISTRY_CLAIMS = "RegistryClaims";
var SHEET_FUNDS = "Funds";

// Venmo has no API, so AmountRaised is not automatic — update it by hand
// in the sheet as gifts come in, and the progress bar reflects that number.
var FUNDS_HEADERS = [
  "ID", "Name", "Description", "Goal", "AmountRaised", "ImageURL", "VenmoLink", "Active",
];

// Your public MyRegistry gift list URL.
var MYREGISTRY_URL = "https://www.myregistry.com/giftlist/aislingandkaren";

var REGISTRY_ITEMS_HEADERS = [
  "ID", "Category", "Name", "Description", "ImageURL",
  "PriceMin", "PriceMax", "QtyNeeded",
  "Link1Store", "Link1Url", "Link2Store", "Link2Url", "Link3Store", "Link3Url",
  "Active", "Source", "ExternalPurchased",
];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, SHEET_RSVP, [
    "Timestamp", "Full Name", "Email", "Attending", "Party Size", "Notes",
  ]);

  ensureSheet_(ss, SHEET_GUESTS, [
    "Timestamp", "Household (Name / Email)", "Guest Name", "Dietary Restrictions",
  ]);

  ensureSheet_(ss, SHEET_REGISTRY_ITEMS, REGISTRY_ITEMS_HEADERS);
  ensureRegistryItemsHeaders_(ss);

  ensureSheet_(ss, SHEET_REGISTRY_CLAIMS, [
    "Timestamp", "ItemID", "Name", "Email",
  ]);

  ensureSheet_(ss, SHEET_FUNDS, FUNDS_HEADERS);

  SpreadsheetApp.getUi().alert("Setup complete — RSVP, Guests, RegistryItems, RegistryClaims, and Funds tabs are ready. Add your own registry items to the RegistryItems tab, use Wedding Site > Sync MyRegistry Now to pull in items from your MyRegistry list, and add cash funds (honeymoon, baby, etc.) to the Funds tab.");
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Wedding Site")
    .addItem("Sync MyRegistry Now", "syncMyRegistryNow")
    .addToUi();
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
}

// Self-healing migration: adds the Source / ExternalPurchased columns to an
// existing RegistryItems tab that predates the MyRegistry sync feature.
function ensureRegistryItemsHeaders_(ss) {
  var sheet = ss.getSheetByName(SHEET_REGISTRY_ITEMS);
  var lastCol = sheet.getLastColumn();
  var currentHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  REGISTRY_ITEMS_HEADERS.forEach(function (header, i) {
    if (currentHeaders[i] !== header) {
      sheet.getRange(1, i + 1).setValue(header);
    }
  });
}

function doGet(e) {
  var action = e.parameter.action;

  if (action === "registry") {
    return jsonResponse_({ items: getRegistryItems_() });
  }

  if (action === "funds") {
    return jsonResponse_({ funds: getFunds_() });
  }

  return jsonResponse_({ error: "Unknown action" });
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);

  if (payload.action === "rsvp") {
    saveRsvp_(payload);
    return jsonResponse_({ result: "success" });
  }

  if (payload.action === "claim") {
    saveClaim_(payload);
    return jsonResponse_({ result: "success" });
  }

  return jsonResponse_({ result: "error", message: "Unknown action" });
}

function saveRsvp_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rsvpSheet = ss.getSheetByName(SHEET_RSVP);
  var guestsSheet = ss.getSheetByName(SHEET_GUESTS);
  var timestamp = new Date();

  rsvpSheet.appendRow([
    timestamp,
    payload.fullName || "",
    payload.email || "",
    payload.attending || "",
    payload.partySize || "",
    payload.notes || "",
  ]);

  var household = (payload.fullName || "") + " / " + (payload.email || "");
  (payload.guests || []).forEach(function (guest) {
    if (!guest.name) return;
    guestsSheet.appendRow([timestamp, household, guest.name, guest.dietary || ""]);
  });
}

function saveClaim_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_REGISTRY_CLAIMS);
  sheet.appendRow([
    new Date(),
    payload.itemId || "",
    payload.name || "",
    payload.email || "",
  ]);
}

function getRegistryItems_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var itemsSheet = ss.getSheetByName(SHEET_REGISTRY_ITEMS);
  var claimsSheet = ss.getSheetByName(SHEET_REGISTRY_CLAIMS);

  var itemRows = itemsSheet.getDataRange().getValues();
  var claimRows = claimsSheet.getDataRange().getValues();

  // count our own site's claims per item ID (skip header row)
  var claimCounts = {};
  for (var c = 1; c < claimRows.length; c++) {
    var itemId = claimRows[c][1];
    claimCounts[itemId] = (claimCounts[itemId] || 0) + 1;
  }

  var items = [];
  for (var r = 1; r < itemRows.length; r++) {
    var row = itemRows[r];
    var id = row[0];
    var active = row[14];
    if (!id || (active !== "" && String(active).toUpperCase() === "N")) continue;

    var links = [];
    if (row[8] && row[9]) links.push({ store: row[8], url: row[9] });
    if (row[10] && row[11]) links.push({ store: row[10], url: row[11] });
    if (row[12] && row[13]) links.push({ store: row[12], url: row[13] });

    var source = row[15] || "";
    // MyRegistry items: purchase happens on MyRegistry, so their own
    // purchased count (refreshed on each sync) is the source of truth —
    // NOT our own RegistryClaims, which only tracks claims made on this site.
    var qtyClaimed = source === "MyRegistry"
      ? Number(row[16]) || 0
      : claimCounts[id] || 0;

    items.push({
      id: id,
      category: row[1],
      name: row[2],
      description: row[3],
      imageUrl: row[4],
      priceMin: Number(row[5]) || 0,
      priceMax: Number(row[6]) || 0,
      qtyNeeded: Number(row[7]) || 1,
      qtyClaimed: qtyClaimed,
      links: links,
      source: source,
    });
  }

  return items;
}

function getFunds_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_FUNDS);
  if (!sheet) return [];

  var rows = sheet.getDataRange().getValues();
  var funds = [];

  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    var id = row[0];
    var active = row[7];
    if (!id || (active !== "" && String(active).toUpperCase() === "N")) continue;

    funds.push({
      id: id,
      name: row[1],
      description: row[2],
      goal: Number(row[3]) || 0,
      raised: Number(row[4]) || 0,
      imageUrl: row[5],
      venmoLink: row[6],
    });
  }

  return funds;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- MyRegistry sync ----------

function syncMyRegistryNow() {
  var ui = SpreadsheetApp.getUi();
  try {
    var result = syncMyRegistry_();
    var message = result.added + " item(s) added, " + result.updated + " updated.";
    if (result.errors.length) {
      message += "\n\nSome items had issues:\n" + result.errors.join("\n");
    }
    ui.alert("MyRegistry sync complete", message, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert(
      "MyRegistry sync failed",
      "Couldn't read your MyRegistry list. This usually means MyRegistry changed their page format. Error: " + err.message,
      ui.ButtonSet.OK
    );
  }
}

function syncMyRegistry_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureRegistryItemsHeaders_(ss);
  var sheet = ss.getSheetByName(SHEET_REGISTRY_ITEMS);

  var response = UrlFetchApp.fetch(MYREGISTRY_URL, {
    muteHttpExceptions: true,
    followRedirects: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("MyRegistry returned HTTP " + response.getResponseCode() + ". Double-check MYREGISTRY_URL is correct and the list is public.");
  }

  var myItems = parseMyRegistryLdJson_(response.getContentText());
  if (myItems.length === 0) {
    throw new Error("No items found on the page. MyRegistry may have changed their page format, or the list has no items yet.");
  }

  var dataRange = sheet.getDataRange();
  var rows = dataRange.getValues();
  var idToRowIndex = {}; // sheet row index (1-based, includes header) by ID
  for (var r = 1; r < rows.length; r++) {
    if (rows[r][0]) idToRowIndex[rows[r][0]] = r + 1;
  }

  var added = 0;
  var updated = 0;
  var errors = [];

  myItems.forEach(function (item) {
    try {
      var rowValues = [
        item.id,
        "MyRegistry Picks",
        item.name,
        item.description,
        item.imageUrl,
        item.price,
        item.price,
        item.desired,
        item.sellerName || "Buy Now",
        item.buyUrl,
        "", "", "", "",
        "Y",
        "MyRegistry",
        item.purchased,
      ];

      var existingRow = idToRowIndex[item.id];
      if (existingRow) {
        sheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
        updated++;
      } else {
        sheet.appendRow(rowValues);
        added++;
      }
    } catch (itemErr) {
      errors.push(item.name + ": " + itemErr.message);
    }
  });

  return { added: added, updated: updated, errors: errors };
}

// Parses the schema.org JSON-LD block MyRegistry embeds in gift list pages
// for search engines. Not an official API — see file header comment.
function parseMyRegistryLdJson_(html) {
  var items = [];
  var scriptRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  var match;

  while ((match = scriptRegex.exec(html))) {
    var data;
    try {
      data = JSON.parse(match[1]);
    } catch (e) {
      continue;
    }

    var listElements = data && data.mainEntity && data.mainEntity.itemListElement;
    if (!listElements) continue;

    listElements.forEach(function (el) {
      var demand = el.item;
      var product = demand && demand.itemOffered;
      var offer = product && product.offers;
      if (!product || !offer) return;

      var giftId = extractGiftId_(offer.url || demand.url || "");
      var qty = demand.eligibleQuantity || {};
      var extraDetail = [product.size, product.color].filter(Boolean).join(", ");

      items.push({
        id: "mr-" + (giftId || product.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()),
        name: product.name,
        description: extraDetail,
        imageUrl: product.image || "",
        price: Number(offer.price) || 0,
        desired: qty.maxValue != null ? Number(qty.maxValue) : 1,
        purchased: qty.value != null ? Number(qty.value) : 0,
        buyUrl: offer.url || demand.url,
        sellerName: offer.seller && offer.seller.name,
      });
    });
  }

  return items;
}

function extractGiftId_(url) {
  var match = /giftId=(\d+)/i.exec(url || "");
  return match ? match[1] : "";
}
