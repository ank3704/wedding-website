// Builds "Add to Calendar" links (Google Calendar + downloadable .ics)
// from data attributes on each .timeline-item element.
//
// Required data attributes on the trigger element:
//   data-title, data-start (YYYY-MM-DDTHH:MM), data-end (YYYY-MM-DDTHH:MM),
//   data-location, data-description

function pad(n) {
  return String(n).padStart(2, "0");
}

function toUtcStamp(localDateTimeString) {
  var d = new Date(localDateTimeString);
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00Z"
  );
}

function buildGoogleCalendarUrl(data) {
  var params = new URLSearchParams({
    action: "TEMPLATE",
    text: data.title,
    dates: toUtcStamp(data.start) + "/" + toUtcStamp(data.end),
    details: data.description || "",
    location: data.location || "",
  });
  return "https://www.google.com/calendar/render?" + params.toString();
}

function buildIcsContent(data) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding Site//EN",
    "BEGIN:VEVENT",
    "UID:" + Date.now() + "@wedding",
    "DTSTAMP:" + toUtcStamp(new Date().toISOString()),
    "DTSTART:" + toUtcStamp(data.start),
    "DTEND:" + toUtcStamp(data.end),
    "SUMMARY:" + data.title,
    "DESCRIPTION:" + (data.description || ""),
    "LOCATION:" + (data.location || ""),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadIcs(data) {
  var blob = new Blob([buildIcsContent(data)], { type: "text/calendar" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = data.title.replace(/[^a-z0-9]+/gi, "-") + ".ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-cal-google]").forEach(function (el) {
    var data = {
      title: el.dataset.title,
      start: el.dataset.start,
      end: el.dataset.end,
      location: el.dataset.location,
      description: el.dataset.description,
    };
    el.href = buildGoogleCalendarUrl(data);
    el.target = "_blank";
    el.rel = "noopener";
  });

  document.querySelectorAll("[data-cal-ics]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      downloadIcs({
        title: el.dataset.title,
        start: el.dataset.start,
        end: el.dataset.end,
        location: el.dataset.location,
        description: el.dataset.description,
      });
    });
  });
});
