import { Cheerio, load } from "cheerio";
import fetch from "node-fetch";

import * as fs from "fs";
import * as readline from "readline";
import { Channel, DataEntry, Standard } from "./data.model";
import { data } from "cheerio/dist/commonjs/api/attributes";
import {
  extractParenthesizedSubstring,
  removeParenthesizedSubstring,
} from "./helpers";

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
      const trs = $("tr");
      let data: DataEntry[] = [];
      console.log("length: ", trs.length, data.length);
      trs.each((i, row) => {
        const standard: Partial<Standard> = {};
        $(row)
          .find("td, th")
          .each((j, cell) => {
            const cellText = $(cell).text().trim();
            if (i === 0) {
              // First row contains headers with product names
              // starting from third col
              if (j > 2) {
                data.push({ productName: cellText, approvedStandards: [] });
              }
            } else {
              switch (j) {
                case 0:
                  standard.name = cellText;
                  break;
                case 1:
                  standard.id = removeParenthesizedSubstring(cellText);
                  const parenthesisTexts =
                    extractParenthesizedSubstring(cellText);
                  console.log("par", parenthesisTexts);
                  standard.version =
                    parenthesisTexts?.length == 1
                      ? parenthesisTexts[0]
                      : undefined;
                  break;
                case 2:
                  standard.channel =
                    cellText == "Modtage"
                      ? Channel.Receive
                      : cellText == "Sende"
                      ? Channel.Send
                      : undefined;
                  break;
                default:
                  const dataIndex = j - 3;
                  if (cellText == "Godkendt") {
                    data[dataIndex].approvedStandards.push(
                      standard as Standard
                    );
                  }
              }
            }
          });
      });
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync("../app/public/data.json", json, {});
    });
});
