import { load } from "cheerio";
import { randomUUID } from "crypto";
import * as fs from "fs";
import fetch from "node-fetch";
import { Channel, DataRecord, Standard } from "./data.model";
import {
  extractParenthesizedSubstring,
  removeParenthesizedSubstring,
} from "./helpers";

fetch(
  "https://medcomdk.github.io/GodkendteSystemer/html/Alle%20systemer%20(Liste).htm"
)
  .then((res) => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.text();
  })
  .then((body) => {
    const $ = load(body);
    const trs = $("tr");
    const dataEntriesHashTable: Map<string, DataRecord> = new Map();
    trs.each((i, row) => {
      const standard: Partial<Standard> = {};
      const record = new DataRecord(randomUUID());

      $(row)
        .find("td, th")
        .each((j, cell) => {
          const cellText = $(cell).text().trim();
          switch (j) {
            case 0:
              record.productName = cellText;
              break;
            case 1:
              record.vendor = cellText;
              break;
            case 2:
              record.systemType = cellText;
              break;
            case 3:
              standard.name = cellText;
              break;
            case 4:
              const textFromParenthesis =
                extractParenthesizedSubstring(cellText);
              standard.version =
                textFromParenthesis.length == 1
                  ? textFromParenthesis[0]
                  : undefined;
              standard.id = removeParenthesizedSubstring(cellText);
              break;
            case 5:
              standard.channel =
                cellText === "Modtage" ? Channel.Receive : Channel.Send;
              break;
            default:
              const dataIndex = j - 3;
              if (cellText == "Godkendt") {
                if (dataEntriesHashTable.has(record.hash)) {
                  dataEntriesHashTable
                    .get(record.hash)!
                    .approvedStandards.push(standard as Standard);
                } else {
                  record.approvedStandards.push(standard as Standard);
                  dataEntriesHashTable.set(record.hash, record);
                }
              }
          }
        });
    });
    const json = JSON.stringify(
      Array.from(dataEntriesHashTable.values()),
      null,
      2
    );
    fs.writeFileSync("../app/public/assets/data.json", json, {});
  });
