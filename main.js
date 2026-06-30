// Configurations
require("dotenv").config();

const { App } = require("@slack/bolt");
const path = require("path");
const Database = require("better-sqlite3");
const db = new Database(path.join(__dirname, "users.db"));

// Initialize table for creating users to track progress
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT,
    slack_id TEXT UNIQUE,
    current_level INTEGER,
    view_t INTEGER DEFAULT 0
  )
`);

// SQLite statements to manage users
const findUser = db.prepare("SELECT * FROM users WHERE slack_id = ? ");
const createUser = db.prepare(
  "INSERT INTO users (name, current_level, slack_id) VALUES (?, ?, ?)",
);
const updateLevel = db.prepare(
  "UPDATE users SET current_level = ? WHERE slack_id = ?",
);
const viewed = db.prepare("UPDATE users SET view_t = 1 WHERE slack_id = ?");
const resetViewed = db.prepare(
  "UPDATE users SET view_t = 0 WHERE slack_id = ?",
);

// Initialize Slack Bolt Application with tokens
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.APP_LEVEL_TOKEN,
  socketMode: true,
});

// Array of puzzles with different ciphers, difficulties, and hints
const puzzle = [
  {
    puzzle_id: 1,
    cipher: "Caesar",
    difficulty: "Easy",
    transmission: "JUHHWLQJV",
    answer: "GREETINGS",
    hint: "Shift is +3",
  },
  {
    puzzle_id: 2,
    cipher: "Caesar",
    difficulty: "Easy",
    transmission: "GMJ HDSFWL AK VWKLJGQWV",
    answer: "OUR PLANET IS DESTROYED",
    hint: "Shift is -8",
  },
  {
    puzzle_id: 3,
    cipher: "Atbash",
    difficulty: "Easy",
    transmission: "BLFI SZYRGZYOV KOZMVG",
    answer: "YOUR HABITABLE PLANET",
    hint: "Use Atbash converter",
  },
  {
    puzzle_id: 4,
    cipher: "Atbash",
    difficulty: "Easy",
    transmission: "RH LFI LMOB SLKV",
    answer: "IS OUR ONLY HOPE",
    hint: "Use Atbash converter",
  },
  {
    puzzle_id: 5,
    cipher: "Morse",
    difficulty: "Medium",
    transmission: ".-- . / -.-. --- -- . / .. -. / .--. . .- -.-. .",
    answer: "WE COME IN PEACE",
    hint: "Words are separated by slashes",
  },
  {
    puzzle_id: 6,
    cipher: "Morse",
    difficulty: "Medium",
    transmission:
      ".--. .-.. . .- ... . / --. .. ...- . / ..- ... / .-. . ..-. ..- --. .",
    answer: "PLEASE GIVE US REFUGE",
    hint: "Words are separated by slashes",
  },
  {
    puzzle_id: 7,
    cipher: "Binary",
    difficulty: "Hard",
    transmission:
      "01010101 01001110 01001011 01001110 01001111 01010111 01001110 00100000 01001001 01001110 01010100 01000101 01010010 01000110 01000101 01010010 01000101 01001110 01000011 01000101",
    answer: "UNKNOWN INTERFERENCE",
    hint: "Use ASCII binary converter",
  },
  {
    puzzle_id: 8,
    cipher: "Binary",
    difficulty: "Hard",
    transmission:
      "01010011 01001001 01000111 01001110 01000001 01001100 00100000 01001001 01010011 00100000 01000010 01000001 01000011 01001011 00100000 01001111 01001110 01001100 01001001 01001110 01000101",
    answer: "SIGNAL IS BACK ONLINE",
    hint: "Use ASCII binary converter",
  },
  {
    puzzle_id: 9,
    cipher: "Vigenere",
    difficulty: "Expert",
    transmission: "OX AIH AG VLW DUZSEE DIDM",
    answer: "WE ARE AT THE KUIPER BELT",
    hint: "Keyword: Stardance",
  },
  {
    puzzle_id: 10,
    cipher: "Vigenere",
    difficulty: "Expert",
    transmission: "HEERVE CTIHTRV IOE QYJ TRILVNN",
    answer: "PLEASE PREPARE FOR OUR ARRIVAL",
    hint: "Keyword: Stardance",
  },
];

// Displays the user's name, rank, and progress
app.command("/sdo-profile", async ({ ack, respond, body }) => {
  try {
    await ack();
    const slackId = body.user_id;
    let user = findUser.get(slackId);
    if (!user) {
      await respond({
        text: "No officer profile found. Start by running /sdo-transmission.",
      });
      return;
    }
    const level = user.current_level;
    const progress = Math.floor((user.current_level / puzzle.length) * 100);
    let rank = "Cadet";
    if (level >= 4) {
      rank = "Analyst";
    }
    if (level >= 6) {
      rank = "Lieutenant";
    }
    if (level >= 8) {
      rank = "Commander";
    }
    if (level >= puzzle.length) {
      rank = "Galactic Decoder";
    }
    await respond({
      text: `\`\`\`
========================================
          OFFICER RECORD 
========================================

Name: ${user.name}

Rank: ${rank}

Completion: ${progress}%
========================================
\`\`\``,
    });
  } catch (err) {
    console.log(err);
  }
});

// Displays information about the current ciphers
app.command("/sdo-handbook", async ({ ack, respond, body }) => {
  try {
    await ack();
    const slackId = body.user_id;
    let user = findUser.get(slackId);
    if (!user) {
      await respond({
        text: `
[MISSION CONTROL]

>> Communication terminal inactive. Run /sdo-transmission first.`,
      });
      return;
    }
    const level = user.current_level;
    let handbook = `
========================================
            CIPHER DATABASE 
========================================

----------------------------------------
>> Caesar Cipher
Shifts letters a certain amount.
  `;
    if (level >= 2) {
      handbook += `
----------------------------------------
>> Atbash Cipher
Reverses the alphabet.
    `;
    }

    if (level >= 4) {
      handbook += `
----------------------------------------
>> Morse Code
Represents letters using dots and dashes.
    `;
    }

    if (level >= 6) {
      handbook += `
----------------------------------------
>> Binary Code
Represents text using 1s and 0s.
    `;
    }

    if (level >= 8) {
      handbook += `
----------------------------------------
>> Vigenere Cipher
Uses a keyword to shift letters differently
throughout the message.
    `;
    }

    await respond({
      text: `\`\`\`
${handbook}
    \`\`\``,
    });
  } catch (err) {
    console.log(err);
  }
});

// Displays past transmissions
app.command("/sdo-log", async ({ ack, respond, body }) => {
  try {
    await ack();
    const slackId = body.user_id;
    let user = findUser.get(slackId);
    if (!user) {
      await respond({
        text: `
[MISSION CONTROL]

>> Communication terminal inactive. Run /sdo-transmission first.`,
      });
      return;
    }
    const level = user.current_level;
    let logs = `    
========================================
        TRANSMISSION ARCHIVE 
========================================`;
    if (level >= 1) {
      logs += `
-----------------------------------
>> Transmission 1
GREETINGS
    `;
    }
    if (level >= 2) {
      logs += `
-----------------------------------
>> Transmission 2
OUR PLANET IS DESTROYED
  `;
    }
    if (level >= 3) {
      logs += `
-----------------------------------
>> Transmission 3
YOUR HABITABLE PLANET
    `;
    }
    if (level >= 4) {
      logs += `
-----------------------------------
>> Transmission 4
IS OUR ONLY HOPE
  `;
    }
    if (level >= 5) {
      logs += `
-----------------------------------
>> Transmission 5
WE COME IN PEACE
    `;
    }
    if (level >= 6) {
      logs += `
-----------------------------------
>> Transmission 6
PLEASE GIVE US REFUGE
  `;
    }
    if (level >= 7) {
      logs += `
-----------------------------------
>> Transmission 7
UNKNOWN INTERFERENCE
    `;
    }
    if (level >= 8) {
      logs += `
-----------------------------------
>> Transmission 8
SIGNAL IS BACK ONLINE
  `;
    }
    if (level >= 9) {
      logs += `
-----------------------------------
>> Transmission 9
WE ARE AT THE KUIPER BELT
    `;
    }
    if (level >= 10) {
      logs += `
-----------------------------------
>> Transmission 10
PLEASE PREPARE FOR OUR ARRIVAL
  `;
    }
    await respond({
      text: `\`\`\`
${logs}
\`\`\``,
    });
  } catch (err) {
    console.log(err);
  }
});

// Displays the transmission including which puzzle, its unique cipher, and its difficulty
app.command("/sdo-transmission", async ({ ack, respond, body }) => {
  try {
    await ack();
    const slackId = body.user_id;
    let user = findUser.get(slackId);
    if (!user) {
      createUser.run(body.user_name, 0, slackId);
      user = findUser.get(slackId);
    }
    const level = user.current_level;
    if (level < puzzle.length) {
      await respond({
        text: `\`\`\`
========================================
        INCOMING TRANSMISSION 
========================================
    COMMUNICATION TERMINAL v1.0

>> Incoming transmission detected
>> Transmission ID : ${level + 1}/${puzzle.length}
>> Cipher          : ${puzzle[level].cipher}
>> Difficulty      : ${puzzle[level].difficulty}

----------------------------------------
>> ${puzzle[level].transmission}


>> Awaiting decryption...
\`\`\``,
      });
      viewed.run(slackId);
    } else {
      await respond({
        text: `
\`\`\`
=============================================
              MISSION STATUS
=============================================
>> Every known transmission has been decoded. 
>> Diplomatic channels have been established.

>> Status: Success
\`\`\`
      `,
      });
      return;
    }
  } catch (err) {
    console.log(err);
  }
});

// Displays a modal that allows users to answer
app.command("/sdo-answer", async ({ ack, respond, body, client, logger }) => {
  try {
    await ack();
    console.log("answer comm");
    const slackId = body.user_id;
    let user = findUser.get(slackId);
    if (!user) {
      await respond({
        text: `
[MISSION CONTROL]

>> Communication terminal inactive. Run /sdo-transmission first.`,
      });
      return;
    }

    const level = user.current_level;

    if (user.view_t === 0) {
      await respond({
        text: `
[MISSION CONTROL]

>> Communication terminal inactive. Run /sdo-transmission first.`,
      });
      return;
    }
    if (level >= puzzle.length) {
      await respond({
        text: `\`\`\`
=============================================
              MISSION STATUS
=============================================
>> Every known transmission has been decoded. 
>> Diplomatic channels have been established.

>> Status: Success
        \`\`\``,
      });
      return;
    }

    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "first-page",
        title: {
          type: "plain_text",
          text: "Answer",
        },
        submit: {
          type: "plain_text",
          text: "Submit",
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Puzzle ${level + 1}/${puzzle.length}`,
            },
          },
          {
            type: "input",
            block_id: "answer_block",
            label: {
              type: "plain_text",
              text: "Enter deciphered message",
            },
            element: {
              type: "plain_text_input",
              action_id: "user_input",
              multiline: false,
            },
          },
        ],
      },
    });
  } catch (error) {
    logger.error(error);
  }
});

// Handles the modal's logic
app.view("first-page", async ({ ack, body, client, view }) => {
  try {
    const userAns = view.state.values.answer_block.user_input.value;
    const slackId = body.user.id;
    const user = findUser.get(slackId);

    if (!user) {
      await ack();
      await client.chat.postMessage({
        channel: slackId,
        text: `
[MISSION CONTROL]

>> Communication terminal inactive. Run /sdo-transmission first.`,
      });
      return;
    }

    const level = user.current_level;

    if (user.view_t === 0) {
      await ack();
      await client.chat.postMessage({
        channel: slackId,
        text: `
[MISSION CONTROL]

>> Communication terminal inactive. Run /sdo-transmission first.`,
      });
      return;
    }
    if (level >= puzzle.length) {
      await ack();
      await client.chat.postMessage({
        channel: slackId,
        text: `\`\`\`
=============================================
              MISSION STATUS
=============================================
>> Every known transmission has been decoded. 
>> Diplomatic channels have been established.

>> Status: Success
      \`\`\``,
      });
      return;
    }
    if (userAns.trim().toUpperCase() !== puzzle[level].answer.toUpperCase()) {
      await ack({
        response_action: "errors",
        errors: {
          answer_block:
            "Answer is Incorrect. Use /sdo-hint and /sdo-handbook if you need help.",
        },
      });
      return;
    }
    await ack();
    const newLevel = level + 1;
    updateLevel.run(newLevel, slackId);
    resetViewed.run(slackId);

    if (newLevel === puzzle.length) {
      await client.chat.postMessage({
        channel: slackId,
        text: `\`\`\`
====================================================================
                          MISSION COMPLETE
====================================================================
>> All transmissions have been successfully decoded.
>> Through your efforts, humanity established its first confirmed 
   communication with an extraterrestrial civilization.
>> The approaching vessel has entered Earth's orbit, and diplomatic
   relations can now begin. 

>> Service Record:
   10/10 Transmissions decoded

>> Excellent work, Officer ${user.name}.

      \`\`\``,
      });
      return;
    } else {
      await client.chat.postMessage({
        channel: slackId,
        text: `

[MISSION CONTROL]

>> Transmission decoded successfully.
>> Archive synchronized.
>> Run /sdo-log to review the transmission.
>> Run /sdo-transmission to intercept the next signal.

>> Standing by for next transmission...
        `,
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// Displays hint
app.command("/sdo-hint", async ({ ack, respond, body }) => {
  try {
    await ack();
    const slackId = body.user_id;
    const user = findUser.get(slackId);
    if (!user) {
      await respond({
        text: `
[MISSION CONTROL]

>> Communication terminal inactive. Run /sdo-transmission first.`,
      });
      return;
    }
    const level = user.current_level;
    if (level >= puzzle.length) {
      await respond({
        text: `\`\`\`
=============================================
              MISSION STATUS
=============================================
>> Every known transmission has been decoded. 
>> Diplomatic channels have been established.

>> Status: Success
        \`\`\``,
      });
      return;
    }
    await respond({
      text: `\`\`\`
========================================
          DECRYPTION HINTS 
========================================

>> Hint: ${puzzle[level].hint}
    \`\`\``,
    });
  } catch (err) {
    console.log(err);
  }
});

// Checks if bot is running
(async () => {
  await app.start();
  console.log("bot is running!");
})();
