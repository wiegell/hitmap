import { Color } from "chroma-js";
import * as fs from "fs";
import * as _ from "lodash";
import { findFurthestPoints } from "./color-generator";

// main.js
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

if (isMainThread) {
  // Main thread logic
  const inputData = Array.from({ length: 80 }, (_, i) => i + 1); // Example input data
  const numWorkers = 10;
  const results: Color[][][] = Array.from({ length: numWorkers }, () => []);
  let completed = 0;

  // Create workers
  for (let i = 0; i < numWorkers; i++) {
    const worker = new Worker(__filename, {
      workerData: { id: i, data: inputData },
    });

    worker.on("message", (result: { data: Color[][]; workerId: number }) => {
      results[result.workerId].push(...result.data);
      completed++;
      if (completed === numWorkers) {
        // Save data
        const flattened = _.flatten(results);
        flattened.sort((palette1, palette2) => {
          if (palette1.length === palette2.length) return 0;
          if (palette1.length > palette2.length) return 1;
          return -1;
        });
        const json = JSON.stringify(flattened, null, 2);
        const ts = `export const palettes: string[][] = ${json}`;
        fs.writeFileSync("../app/src/app/helpers/color.palettes.ts", ts);
      }
    });

    worker.on("error", (err: Error) => {
      console.error("Worker error:", err);
    });
  }
} else {
  // Worker thread logic
  const { id, data } = workerData;
  const processChunk = (id: number, data: number[]) => {
    // Filter data for this worker based on modulo operation
    const chunk = data.filter((_, index) => index % 10 === id);
    // Example processing: double each element
    return chunk.map((x) => findFurthestPoints(x, 2000));
  };

  const result = processChunk(id, data);
  parentPort.postMessage({ workerId: id, data: result });
}
