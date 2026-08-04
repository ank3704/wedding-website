// Demo funds shown only when no Apps Script backend is connected yet.
// Real funds live in the "Funds" tab of the Google Sheet — see
// apps-script/README.md. AmountRaised is entered by hand (Venmo has no
// API to read transactions), so the progress bar reflects whatever that
// column says as of your last update.
var DEMO_FUNDS = [
  {
    id: "demo-honeymoon",
    name: "Honeymoon Fund",
    description: "Help send us to the coast for a week of doing absolutely nothing.",
    goal: 2000,
    raised: 650,
    imageUrl: "https://placehold.co/400x200/e2c4a1/2b3c50?text=Honeymoon",
    venmoLink: "#",
  },
  {
    id: "demo-baby",
    name: "Future Baby Fund",
    description: "No rush — but if you'd like to help us get a head start, we won't say no.",
    goal: 1000,
    raised: 120,
    imageUrl: "https://placehold.co/400x200/789163/f8f4f0?text=Baby+Fund",
    venmoLink: "#",
  },
];

document.addEventListener("DOMContentLoaded", function () {
  var gridEl = document.getElementById("fund-grid");
  if (!gridEl) return;

  var appsScriptUrl = window.WEDDING_CONFIG && window.WEDDING_CONFIG.APPS_SCRIPT_URL;
  var isDemo = !appsScriptUrl || appsScriptUrl.indexOf("PASTE_YOUR") === 0;

  function money(n) {
    return "$" + Math.round(n).toLocaleString();
  }

  function renderFunds(funds) {
    gridEl.innerHTML = "";

    if (funds.length === 0) {
      gridEl.innerHTML = '<p class="center lede">No funds set up yet.</p>';
      return;
    }

    funds.forEach(function (fund) {
      var pct = fund.goal > 0 ? Math.min(100, Math.round((fund.raised / fund.goal) * 100)) : 0;
      var isComplete = fund.raised >= fund.goal && fund.goal > 0;

      var card = document.createElement("div");
      card.className = "fund-card";
      card.innerHTML =
        '<img class="fund-img" src="' + fund.imageUrl + '" alt="' + fund.name + '" />' +
        '<div class="fund-body">' +
        "<h3>" + fund.name + "</h3>" +
        '<p class="fund-desc">' + fund.description + "</p>" +
        '<div class="fund-progress-track"><div class="fund-progress-fill' + (isComplete ? " is-complete" : "") + '" style="width:' + pct + '%"></div></div>' +
        '<div class="fund-progress-label"><span>' + money(fund.raised) + " raised</span><span>goal " + money(fund.goal) + "</span></div>" +
        '<a href="' + fund.venmoLink + '" target="_blank" rel="noopener" class="btn btn-primary btn-block">Contribute via Venmo</a>' +
        "</div>";
      gridEl.appendChild(card);
    });
  }

  if (isDemo) {
    renderFunds(DEMO_FUNDS);
    return;
  }

  fetch(appsScriptUrl + "?action=funds")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      renderFunds(data.funds || []);
    })
    .catch(function () {
      gridEl.innerHTML = '<p class="center lede">Couldn\'t load funds right now — please refresh or check back shortly.</p>';
    });
});
