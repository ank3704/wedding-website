// Demo items shown only when no Apps Script backend is connected yet,
// so the page previews correctly before setup. Real items live in the
// "RegistryItems" tab of the Google Sheet once connected — see
// apps-script/README.md.
var DEMO_ITEMS = [
  {
    id: "demo-1",
    category: "Kitchen",
    name: "Enameled Dutch Oven",
    description: "5.5-quart, for the soups and braises we keep promising each other.",
    imageUrl: "https://placehold.co/300x300/e2c4a1/2b3c50?text=Dutch+Oven",
    priceMin: 90,
    priceMax: 130,
    qtyNeeded: 1,
    qtyClaimed: 0,
    links: [
      { store: "Amazon", url: "#" },
      { store: "Macy's", url: "#" },
    ],
  },
  {
    id: "demo-2",
    category: "Home",
    name: "Linen Throw Pillow Covers",
    description: "Set of 2, for the couch we're finally replacing.",
    imageUrl: "https://placehold.co/300x300/e8ca99/2b3c50?text=Pillows",
    priceMin: 25,
    priceMax: 45,
    qtyNeeded: 4,
    qtyClaimed: 1,
    links: [{ store: "Crate & Barrel", url: "#" }],
  },
  {
    id: "demo-3",
    category: "Experiences",
    name: "Honeymoon: Dinner on Us",
    description: "Contribute toward one night out on our honeymoon.",
    imageUrl: "https://placehold.co/300x300/789163/f8f4f0?text=Honeymoon",
    priceMin: 50,
    priceMax: 50,
    qtyNeeded: 10,
    qtyClaimed: 3,
    links: [],
  },
];

document.addEventListener("DOMContentLoaded", function () {
  var listEl = document.getElementById("registry-list");
  var filterEl = document.getElementById("registry-filter");
  var statusEl = document.getElementById("registry-status");
  var modal = document.getElementById("claim-modal");
  var claimNameInput = document.getElementById("claim-name");
  var claimEmailInput = document.getElementById("claim-email");
  var claimConfirmBtn = document.getElementById("claim-confirm");
  var claimCancelBtn = document.getElementById("claim-cancel");

  var allItems = [];
  var activeCategory = "All";
  var pendingClaimId = null;

  var appsScriptUrl = window.WEDDING_CONFIG && window.WEDDING_CONFIG.APPS_SCRIPT_URL;
  var isDemo = !appsScriptUrl || appsScriptUrl.indexOf("PASTE_YOUR") === 0;

  function money(item) {
    if (item.priceMin === item.priceMax) return "$" + item.priceMin;
    return "$" + item.priceMin + " – $" + item.priceMax;
  }

  function renderFilters(items) {
    var categories = ["All"].concat(
      Array.from(new Set(items.map(function (i) { return i.category; })))
    );
    filterEl.innerHTML = "";
    categories.forEach(function (cat) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip" + (cat === activeCategory ? " is-active" : "");
      chip.textContent = cat;
      chip.addEventListener("click", function () {
        activeCategory = cat;
        renderFilters(items);
        renderItems(items);
      });
      filterEl.appendChild(chip);
    });
  }

  function renderItems(items) {
    var filtered = activeCategory === "All"
      ? items
      : items.filter(function (i) { return i.category === activeCategory; });

    listEl.innerHTML = "";

    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="center lede">No items in this category yet.</p>';
      return;
    }

    filtered.forEach(function (item) {
      var remaining = item.qtyNeeded - item.qtyClaimed;
      var fullyClaimed = remaining <= 0;

      var row = document.createElement("div");
      row.className = "registry-row" + (fullyClaimed ? " is-claimed" : "");

      var linksHtml = item.links
        .map(function (l) {
          return '<a href="' + l.url + '" target="_blank" rel="noopener">' + l.store + "</a>";
        })
        .join("");

      var qtyHtml = item.qtyNeeded > 1
        ? '<div class="registry-qty">' + (fullyClaimed ? "All claimed — thank you!" : remaining + " of " + item.qtyNeeded + " still needed") + "</div>"
        : "";

      row.innerHTML =
        '<img class="registry-img" src="' + item.imageUrl + '" alt="' + item.name + '" />' +
        '<div class="registry-info">' +
        "<h3>" + item.name + "</h3>" +
        '<p class="registry-desc">' + item.description + "</p>" +
        '<div class="registry-price">' + money(item) + "</div>" +
        (linksHtml ? '<div class="registry-links">' + linksHtml + "</div>" : "") +
        qtyHtml +
        "</div>" +
        '<div class="registry-action"></div>';

      var actionEl = row.querySelector(".registry-action");
      if (fullyClaimed) {
        var tag = document.createElement("span");
        tag.className = "registry-claimed-tag";
        tag.textContent = item.source === "MyRegistry" ? "Purchased" : "Claimed";
        actionEl.appendChild(tag);
      } else if (item.source === "MyRegistry") {
        // Purchases for these happen on MyRegistry itself, so we send
        // guests there instead of double-tracking via our own claim flow.
        var buyBtn = document.createElement("a");
        buyBtn.href = (item.links[0] && item.links[0].url) || "#";
        buyBtn.target = "_blank";
        buyBtn.rel = "noopener";
        buyBtn.className = "btn btn-navy btn-block";
        buyBtn.textContent = "Buy on MyRegistry";
        actionEl.appendChild(buyBtn);
      } else {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-primary btn-block";
        btn.textContent = "I got this!";
        btn.addEventListener("click", function () {
          openClaimModal(item.id);
        });
        actionEl.appendChild(btn);
      }

      listEl.appendChild(row);
    });
  }

  function openClaimModal(itemId) {
    pendingClaimId = itemId;
    claimNameInput.value = "";
    claimEmailInput.value = "";
    modal.classList.add("is-open");
    claimNameInput.focus();
  }

  function closeClaimModal() {
    modal.classList.remove("is-open");
    pendingClaimId = null;
  }

  claimCancelBtn.addEventListener("click", closeClaimModal);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeClaimModal();
  });

  claimConfirmBtn.addEventListener("click", function () {
    if (!claimNameInput.value.trim()) {
      claimNameInput.focus();
      return;
    }

    if (isDemo) {
      var item = allItems.find(function (i) { return i.id === pendingClaimId; });
      if (item) item.qtyClaimed += 1;
      renderItems(allItems);
      closeClaimModal();
      return;
    }

    claimConfirmBtn.disabled = true;
    claimConfirmBtn.textContent = "Saving...";

    fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "claim",
        itemId: pendingClaimId,
        name: claimNameInput.value.trim(),
        email: claimEmailInput.value.trim(),
        claimedAt: new Date().toISOString(),
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function () {
        return loadRegistry();
      })
      .catch(function () {
        statusEl.textContent = "Couldn't save your claim — please try again.";
      })
      .finally(function () {
        claimConfirmBtn.disabled = false;
        claimConfirmBtn.textContent = "Confirm";
        closeClaimModal();
      });
  });

  function loadRegistry() {
    if (isDemo) {
      statusEl.textContent = "Preview mode — showing sample items until the registry is connected to your Google Sheet.";
      allItems = DEMO_ITEMS;
      renderFilters(allItems);
      renderItems(allItems);
      return Promise.resolve();
    }

    statusEl.textContent = "";
    return fetch(appsScriptUrl + "?action=registry")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        allItems = data.items || [];
        renderFilters(allItems);
        renderItems(allItems);
      })
      .catch(function () {
        statusEl.textContent = "Couldn't load the registry right now — please refresh or check back shortly.";
      });
  }

  loadRegistry();
});
