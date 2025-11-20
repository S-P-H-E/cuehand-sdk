import "dotenv/config";
import { Cuehand } from "../src/Cuehand.ts";
import { z } from "zod";

async function main() {
  const cuehand = new Cuehand({
    type: "LOCAL",
    model: "google/gemini-2.5-flash",
  });

  await cuehand.init();

  await cuehand.goto("https://ollama.com/");

  const [action] = await cuehand.observe("click the search bar at the top");

  if (action) {
    await cuehand.act(action);
  }

  await cuehand.act("type 'gemini' into the search bar");

  await cuehand.act("press enter");

  await cuehand.wait(2);

  await cuehand.act("click the first result that shows up");

  const modelDetails = await cuehand.extract("get the model details",
    z.object({
      model: z.string().describe("the exact model name"),
      description: z.string().describe("the model description"),
      download: z.number().describe("the number of downloads"),
    })
  );

  console.log(modelDetails);

  await cuehand.wait(10);

  await cuehand.close();
}

main()