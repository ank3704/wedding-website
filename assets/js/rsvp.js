// Demo guest list shown only when no Apps Script backend is connected yet,
// so the lookup can be previewed locally. Real data comes from the
// separate guest-allocation spreadsheet — see apps-script/Code.gs
// (GUESTLIST_SPREADSHEET_ID) and README.md.
var DEMO_GUESTS = [
  { name: "Jordan Smith", allocation: 2, namedGuests: ["Alex Smith"] },
  { name: "Priya Patel", allocation: 1, namedGuests: [] },
  { name: "The Nguyen Family", allocation: 4, namedGuests: ["Minh Nguyen", "Lan Nguyen"] },
];

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("rsvp-form");
  var attendingRadios = form.querySelectorAll('input[name="attending"]');
  var attendingFields = document.getElementById("attending-fields");
  var partySizeInput = document.getElementById("party-size");
  var guestList = document.getElementById("guest-list");
  var submitBtn = document.getElementById("submit-btn");
  var statusEl = document.getElementById("form-status");

  var nameInput = document.getElementById("full-name");
  var nameDropdown = document.getElementById("name-dropdown");
  var nameHint = document.getElementById("name-hint");

  var appsScriptUrl = window.WEDDING_CONFIG && window.WEDDING_CONFIG.APPS_SCRIPT_URL;
  var isDemo = !appsScriptUrl || appsScriptUrl.indexOf("PASTE_YOUR") === 0;

  var allGuests = [];
  var selectedGuest = null; // set only when the guest picks a real dropdown match
  var activeIndex = -1;
  var currentMatches = [];

  function loadGuestList() {
    if (isDemo) {
      allGuests = DEMO_GUESTS;
      return Promise.resolve();
    }
    return fetch(appsScriptUrl + "?action=guestlist")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          nameHint.textContent = "Guest list is temporarily unavailable — please try again shortly or contact us directly.";
          nameHint.classList.add("is-error");
          return;
        }
        allGuests = data.guests || [];
      })
      .catch(function () {
        nameHint.textContent = "Guest list is temporarily unavailable — please try again shortly or contact us directly.";
        nameHint.classList.add("is-error");
      });
  }

  function clearMatchState() {
    selectedGuest = null;
    partySizeInput.max = 1;
    if (parseInt(partySizeInput.value, 10) > 1) partySizeInput.value = 1;
  }

  function renderDropdown(matches) {
    currentMatches = matches;
    activeIndex = -1;

    if (matches.length === 0) {
      nameDropdown.innerHTML = '<div class="autocomplete-empty">No matching invitation found</div>';
    } else {
      nameDropdown.innerHTML = matches
        .map(function (g, i) {
          return '<div class="autocomplete-item" data-index="' + i + '">' + g.name + "</div>";
        })
        .join("");
    }
    nameDropdown.classList.add("is-open");
  }

  function closeDropdown() {
    nameDropdown.classList.remove("is-open");
    nameDropdown.innerHTML = "";
  }

  function selectGuest(guest) {
    selectedGuest = guest;
    nameInput.value = guest.name;
    closeDropdown();
    nameHint.classList.remove("is-error");
    nameHint.textContent = "Found you! You're allocated " + guest.allocation + (guest.allocation === 1 ? " seat." : " seats.");

    partySizeInput.max = guest.allocation;
    partySizeInput.value = Math.min(parseInt(partySizeInput.value, 10) || 1, guest.allocation);
    renderGuestFields();
  }

  nameInput.addEventListener("input", function () {
    clearMatchState();
    nameHint.classList.remove("is-error");
    nameHint.textContent = "We'll match this against your invitation to show your available party size.";

    var typed = nameInput.value.trim().toLowerCase();
    if (typed.length < 2) {
      closeDropdown();
      return;
    }

    var matches = allGuests
      .filter(function (g) { return g.name.toLowerCase().indexOf(typed) !== -1; })
      .slice(0, 8);
    renderDropdown(matches);
  });

  nameInput.addEventListener("keydown", function (e) {
    if (!nameDropdown.classList.contains("is-open") || currentMatches.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
      highlightActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      highlightActive();
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        selectGuest(currentMatches[activeIndex]);
      }
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  });

  function highlightActive() {
    nameDropdown.querySelectorAll(".autocomplete-item").forEach(function (el, i) {
      el.classList.toggle("is-active", i === activeIndex);
    });
  }

  nameDropdown.addEventListener("click", function (e) {
    var item = e.target.closest(".autocomplete-item[data-index]");
    if (!item) return;
    selectGuest(currentMatches[Number(item.dataset.index)]);
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".autocomplete")) closeDropdown();
  });

  function renderGuestFields() {
    var max = selectedGuest ? selectedGuest.allocation : 1;
    var count = Math.min(Math.max(parseInt(partySizeInput.value, 10) || 1, 1), max);
    guestList.innerHTML = "";

    for (var i = 1; i <= count; i++) {
      var prefill = "";
      var isNamed = false;
      if (selectedGuest) {
        if (i === 1) {
          prefill = selectedGuest.name;
          isNamed = true;
        } else if (selectedGuest.namedGuests[i - 2]) {
          prefill = selectedGuest.namedGuests[i - 2];
          isNamed = true;
        }
      }

      var block = document.createElement("div");
      block.className = "guest-block";
      block.innerHTML =
        '<h4 style="margin-bottom: 1rem; color: var(--navy);">Guest ' + i +
        (isNamed ? '<span class="guest-name-tag">On invitation</span>' : "") + "</h4>" +
        '<div class="form-row">' +
        '<label for="guest-name-' + i + '">Full name</label>' +
        '<input type="text" id="guest-name-' + i + '" name="guestName' + i + '" value="' + prefill.replace(/"/g, "&quot;") + '" ' + (i === 1 ? "required" : "") + " />" +
        "</div>" +
        '<div class="form-row">' +
        '<label for="guest-diet-' + i + '">Dietary restrictions / allergies</label>' +
        '<input type="text" id="guest-diet-' + i + '" name="guestDiet' + i + '" placeholder="e.g. vegetarian, gluten-free, none" />' +
        "</div>";
      guestList.appendChild(block);
    }
  }

  attendingRadios.forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (radio.value === "Yes" && radio.checked) {
        attendingFields.classList.remove("hidden");
        renderGuestFields();
      } else if (radio.value === "No" && radio.checked) {
        attendingFields.classList.add("hidden");
        guestList.innerHTML = "";
      }
    });
  });

  partySizeInput.addEventListener("input", function () {
    var max = selectedGuest ? selectedGuest.allocation : 1;
    if (parseInt(partySizeInput.value, 10) > max) partySizeInput.value = max;
    renderGuestFields();
  });

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "form-status is-visible " + (type === "error" ? "is-error" : "is-success");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!selectedGuest) {
      nameHint.textContent = "We couldn't find your invitation. Please check the spelling or select your name from the dropdown.";
      nameHint.classList.add("is-error");
      nameInput.focus();
      return;
    }

    var appsScriptUrlLocal = window.WEDDING_CONFIG && window.WEDDING_CONFIG.APPS_SCRIPT_URL;
    if (!appsScriptUrlLocal || appsScriptUrlLocal.indexOf("PASTE_YOUR") === 0) {
      showStatus("RSVP backend isn't connected yet — see assets/js/config.js.", "error");
      return;
    }

    var attending = form.querySelector('input[name="attending"]:checked');
    var payload = {
      action: "rsvp",
      fullName: nameInput.value.trim(),
      email: document.getElementById("email").value.trim(),
      attending: attending ? attending.value : "",
      partySize: attending && attending.value === "Yes" ? partySizeInput.value : "0",
      guests: [],
      notes: document.getElementById("notes").value.trim(),
      submittedAt: new Date().toISOString(),
    };

    if (attending && attending.value === "Yes") {
      var count = parseInt(partySizeInput.value, 10) || 1;
      for (var i = 1; i <= count; i++) {
        var nameEl = document.getElementById("guest-name-" + i);
        var dietEl = document.getElementById("guest-diet-" + i);
        payload.guests.push({
          name: nameEl ? nameEl.value.trim() : "",
          dietary: dietEl ? dietEl.value.trim() : "",
        });
      }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    fetch(appsScriptUrlLocal, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.result === "success") {
          form.reset();
          attendingFields.classList.add("hidden");
          guestList.innerHTML = "";
          clearMatchState();
          nameHint.classList.remove("is-error");
          nameHint.textContent = "We'll match this against your invitation to show your available party size.";
          showStatus("Thank you! Your RSVP has been received.", "success");
        } else {
          showStatus("Something went wrong. Please try again or email us directly.", "error");
        }
      })
      .catch(function () {
        showStatus("Something went wrong. Please try again or email us directly.", "error");
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send RSVP";
      });
  });

  loadGuestList();
});
