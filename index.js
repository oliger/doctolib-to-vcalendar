const axios = require("axios");

module.exports = (req, res) => {
  return fetchAppointments(req.query.token)
    .then(appointments => {
      res.setHeader("Content-Type", "text/calendar");
      res.end(toVCalendar(appointments));
    })
    .catch(error => {
      res.end(`Error: ${error.response.data.meta.reason}`);
    });
};

const fetchAppointments = token => {
  return axios
    .get("https://www.doctolib.fr/account/appointments.json", {
      headers: {
        Cookie: `auth_token=${token}`
      }
    })
    .then(r => r.data.data.confirmed);
};

const toVCalendar = appointments => {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID: oliger/doctolib-to-vcalendar",
    "CALSCALE:GREGORIA",
    ...appointments.map(toVEvent),
    "END:VCALENDAR"
  ].join("\n");
};

const toVEvent = appointment => {
  const {
    id,
    start_date: startAt,
    profile: { name_with_title: profileName },
    practice: {
      landline_number: phone,
      note,
      code1,
      code2,
      address,
      zipcode,
      city
    }
  } = appointment;

  const description = [phone, note, code1, code2]
    .filter(v => !!v)
    .join("\\n\\n");

  const startAtDate = new Date(startAt);
  const startAtDateString = toVEventDate(startAtDate);
  startAtDate.setUTCHours(startAtDate.getUTCHours() + 1);
  const endAtDateString = toVEventDate(startAtDate);

  return [
    "BEGIN:VEVENT",

    `UID:${id}`,
    `DTSTAMP:${startAtDateString}`,

    `SUMMARY:${profileName}`,
    // Ensure that lines are not longer than 75 octets.
    `DESCRIPTION:${description}`
      .match(/.{1,74}/g)
      .map(s => ` ${s}`)
      .join("\n")
      .trim(),

    `DTSTART:${startAtDateString}`,
    `DTEND:${endAtDateString}`,

    `LOCATION:${address}\\, ${zipcode} ${city}`,

    "END:VEVENT"
  ].join("\n");
};

const toVEventDate = d => {
  return [
    ...addPadding([d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]),
    "T",
    ...addPadding([d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]),
    "Z"
  ].join("");
};

const addPadding = values => values.map(v => `${v}`.padStart(2, "0"));
