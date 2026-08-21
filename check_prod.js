fetch("https://maxy-iota.vercel.app/api/notifications/fcm/subscribe", { method: "POST", body: "{}" })
  .then(res => console.log("Status:", res.status))
  .catch(err => console.error(err));
