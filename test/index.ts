import "dotenv/config";
import { google } from "@ai-sdk/google"
import { Cuehand } from "../src/Cuehand.ts"
import { generateObject } from "ai";
import zod from "zod";

async function main() {
  const cuehand = new Cuehand({
    type: "LOCAL",
    // model: google("gemini-2.5-flash"),
    model: "moonshotai/kimi-k2",
    userDataDir: "./userData",
    // headless: true,
  })

  await cuehand.init()

  await cuehand.goto("https://www.instagram.com");

  await cuehand.wait(1);

  // const result = await cuehand.observe("find the log in button");

  // if (result) {
  //     await cuehand.act("type %username% into the username field", {
  //     variables: { username: process.env.USER_USERNAME! }
  //   });

  //   await cuehand.wait(1);

  //   await cuehand.act("type %password% into the password field", {
  //     variables: { password: process.env.USER_PASSWORD! }
  //   });

  //   await cuehand.wait(1);

  //   await cuehand.act("click the log in button");
  // } else {
    
  // }

  await cuehand.wait(1);
  await cuehand.act("click the ok button");
  await cuehand.act("click the Search icon");
  await cuehand.act("type 'Instagram' into the search field");
  await cuehand.wait(1);
  await cuehand.act("click the first result");
  await cuehand.act("click Message.");
  await cuehand.wait(10);
  await cuehand.close()
}

main()