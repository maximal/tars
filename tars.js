const os = require('os');
const { spawn } = require('child_process');
const shell = spawn("ssh", ["-F", "gitconfig", "habrachat"], { detached: false });
const fs = require("fs");

const year = new Date().getFullYear() + 1;

shell.stdout.on('data', data => {
  const lines = data.toString()
    .split("\r\n")
    .filter(v => v.match(":") && !v.match(/^\[0;37;90m \*/g))
    .map(v => v
      .replace(/\u001b\[0K/g, "")
      .replace(/\[(\d{1,2};){0,2}\d{1,2}m/g, "")
      .replace(/\u001b/g, "")
    )
    .map(v => {
      const name = v.split(":")[0];
      const text = v.split(":").slice(1).join(":").replace(/^\s/g, "");
      const isBot = name.match(/bridge/g);
      return {
        name: isBot ? text && text.match(/<(.*?)>/g)[0].replace(/<|>/g, "") : name,
        src: isBot ? text && text.match(/\[(.*?)\]/g)[0].replace(/\[|\]/g, "") : "ssh",
        text: isBot ? text && text.replace(/\[(.*?)\] <(.*?)> /g, "") : text
      }
    });
  if (lines.length > 0) {
    onChat(lines);
  }
});

const elka = [
  ".................",
  "........*........",
  ".......***.......",
  "......*****......",
  ".....*******.....",
  ".......***.......",
  `С наступающим ${year}, товарищи!`
].map(l => l.replace(/\*/g, "\\*"));

let elkaTimestamp = new Date().getTime() - 60 * 1000;
const allowElka = () => {
  if (new Date().getTime() - elkaTimestamp > 30 * 1000) {
    elkaTimestamp = new Date().getTime();
    return true;
  }
  return false;
}

const daysUntilNewYear = () => {
  const countdownDate = (new Date("01.01." + year)).getTime();
  const distance = countdownDate - (new Date().getTime()) - (1000 * 60 * 60 * 2);
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  return `${days} ${
    days === 1 ? 'день' : [2,3,4].includes(days) ? 'дня' : 'дней'
  }, ${hours} ${
    hours === 1 ? 'час' : [2,3,4].includes(hours) ? 'часа' : 'часов'
  }, ${minutes} ${
    minutes === 1 ? 'минута' : [2,3,4].includes(minutes) ? 'минуты' : 'минут'
  }`;
}

const throwDice = txt => {
  const [count, sides] = /(\d{0,1})d(\d{1,2})/g.exec(txt).slice(1).map(v => parseInt(v));
  return Array.from({ length: count || 1 }).map(_ => Math.floor((Math.random() * sides) + 1)).reduce((a, d) => a + d, 0);
}

const match = (matches, text) => 
  Object.keys(matches).map(m => text.match(m) && matches[m](text)).filter(v => v).length === 0 && matches.default();

if (!fs.existsSync("logs")) fs.mkdirSync("logs");
const writeLogs = (text, prefix = "logs") =>
  fs.appendFileSync(`logs/${prefix}-${new Date().toLocaleDateString("ru").replace(/\./g, "_")}.txt`, text + "\n");

const onChat = msgs => {
  console.log(msgs);
  const msg = msgs[0];
  console.log(msg);
  if (msg.text.toLowerCase().match(/^(тарс|tars)/g)) {
    match({
      ["привет|hi"]: () => send("Привет-привет!"),
      ["елка|ёлка|елку|ёлку|ылку|йолку"]: () => allowElka() && elka.map((t, i) => setTimeout(() => send(t), 1500*i)),
      ["наступающим|новым"]: () => send(`С наступающим ${year}, товарищи!`),
      ["до (нового года|нг) [0-9]+ минут"]: () => send("Путин готовится"),
      ["сиськи"]: () => send("(.) (.)"),
      ["когда новый|до нового"]: () => send(`До нового года ${daysUntilNewYear()}!`),
      ["[0-9]{0,1}d[0-9]{1,2}"]: text => send(`Выпало ${throwDice(text)}`),
      default: () => send("Что?"),
    }, msg.text.replace(/^(.*?)( |,)/g, "").toLowerCase())
  }

  if (msg.name.toString().match(/-\> \d+ connected/g)) {
    const names = msg.text.split(", ").map(v => v.replace(/\[\d{1,3};\d{1,3};\d{1,3}(m|)/g, "").replace(/\n|\r/g,""));
    writeLogs(names.join(", "), "names");
  } else {
    writeLogs(JSON.stringify(msg));
  }
}

const send = msg => {
  shell.stdin.write(msg + "\r\n");
  return true;
}

setInterval(() => send("/names"), 60 * 1000);

shell.on('close', () => process.exit());
shell.on('exit', () => process.exit());
shell.on('error', () => process.exit());
shell.on('disconnect', () => process.exit());