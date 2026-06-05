require("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  apptoken: process.env.APP_LEVEL_TOKEN,
  socketMode: true,
});

app.command("/galactic-help", async ({ ack, respond }) => {
  ack();
  try {
    await respond({
      text: `
      Available commands:
      /galactic-help - Show all commands
      /transmission - Encrypted message
      /answer - Submit answer
      /hint - Shows hint`,
    });
  } catch (err) {
    await respond({ text: "Failed to get transmission." });
  }
});

/*const puzzle=[
  {
    transmission= "KHOOR",
    answer= "HELLO",
    hint= "Caessar Cipher (+3)"
  }
];*/
(async () => {
  await app.start();
  console.log("bot is running!");
})();
