// Setup express server with post and get routes
const express = require("express");
const { app, BrowserWindow } = require("electron");
const server = express();
const port = 3001;

/** @type {BrowserWindow} */
let win;

// server.get("/", (req, res) => {
//   res.send("GET request to the homepage");
//   showWindow();
// });

function showWindow() {
  if (win && !win.isDestroyed()) {
    win.setFullScreen(true);
    win.setAlwaysOnTop(true, "screen-saver");
    win.focus();
  }
  win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      devTools: false,
    },
    fullscreen: true,
    alwaysOnTop: true,
  });

  // close after 5 seconds
  // map ctrl + q to close
  win.loadFile("index.html");
}

// Take actions depending on the time of the day
function timedAction(timestamp) {
  // Show window if it's between 9pm and 5am
  if (timestamp.getHours() >= 21 || timestamp.getHours() < 5) {
    console.log("show window at " + timestamp.getHours());
    console.log("Show window if it's between 9pm and 5am");
    return showWindow();
  }

  // Close window if it's between 5am and 9pm
  if (timestamp.getHours() >= 5 && timestamp.getHours() < 21) {
    console.log("show window at " + timestamp.getHours());
    console.log("Close window if it's between 5am and 9pm");
    if (!win?.isDestroyed()) return win?.close();
    return;
  }

  // Show window if it's past the 45 minute mark
  if (timestamp.getMinutes() >= 45) {
    console.log("show window at " + timestamp.getMinutes());
    console.log("Show window if it's past the 45 minute mark");
    showWindow();
    return;
  }

  // Close window if it's before the 45 minute mark
  if (timestamp.getMinutes() < 45) {
    console.log("show window at " + timestamp.getMinutes());
    console.log("Close window if it's before the 45 minute mark");
    if (!win?.isDestroyed()) win?.close();
    return;
  }
}

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.whenReady().then(() => {
  setInterval(() => {
    timedAction(new Date());
  }, 1000 * 60);

  timedAction(new Date());
});
app.on("window-all-closed", (e) => {
  e.preventDefault();
});
