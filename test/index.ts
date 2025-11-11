import "dotenv/config";
import { google } from "@ai-sdk/google"
import { Cuehand } from "../src"

async function main() {
  const cuehand = new Cuehand({
    type: "LOCAL",
    model: google("gemini-2.5-flash"),
    userDataDir: "./userData",
    // headless: true,
  })

  await cuehand.init()

  await cuehand.goto("https://www.instagram.com");

  const result = await cuehand.observe("find the login button");

  if (result.found) {
      await cuehand.act("type %username% into the email field", {
      variables: { username: process.env.USER_USERNAME! }
    });

    await cuehand.act("type %password% into the password field", {
      variables: { password: process.env.USER_PASSWORD! }
    });

    await cuehand.act("click the 'Log in' button");
  }

  await cuehand.close()
}

main()