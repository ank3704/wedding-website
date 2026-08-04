document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("rsvp-form");
  var attendingRadios = form.querySelectorAll('input[name="attending"]');
  var attendingFields = document.getElementById("attending-fields");
  var partySizeInput = document.getElementById("party-size");
  var guestList = document.getElementById("guest-list");
  var submitBtn = document.getElementById("submit-btn");
  var statusEl = document.getElementById("form-status");

  function renderGuestFields() {
    var count = Math.min(Math.max(parseInt(partySizeInput.value, 10) || 1, 1), 10);
    guestList.innerHTML = "";

    for (var i = 1; i <= count; i++) {
      var block = document.createElement("div");
      block.className = "guest-block";
      block.innerHTML =
        '<h4 style="margin-bottom: 1rem; color: var(--navy);">Guest ' + i + "</h4>" +
        '<div class="form-row">' +
        '<label for="guest-name-' + i + '">Full name</label>' +
        '<input type="text" id="guest-name-' + i + '" name="guestName' + i + '" ' + (i === 1 ? "required" : "") + " />" +
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

  partySizeInput.addEventListener("input", renderGuestFields);

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "form-status is-visible " + (type === "error" ? "is-error" : "is-success");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var appsScriptUrl = window.WEDDING_CONFIG && window.WEDDING_CONFIG.APPS_SCRIPT_URL;
    if (!appsScriptUrl || appsScriptUrl.indexOf("PASTE_YOUR") === 0) {
      showStatus("RSVP backend isn't connected yet — see assets/js/config.js.", "error");
      return;
    }

    var attending = form.querySelector('input[name="attending"]:checked');
    var payload = {
      action: "rsvp",
      fullName: document.getElementById("full-name").value.trim(),
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

    fetch(appsScriptUrl, {
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
});
