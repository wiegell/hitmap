import { Cheerio, load } from "cheerio";
import fetch from "node-fetch";

import * as fs from "fs";
import * as readline from "readline";

const fileStream = fs.createReadStream("./urls.txt");

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  fetch(line)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.text();
    })
    .then((body) => {
      const $ = load(body);
      console.log($.html());
    });
});
