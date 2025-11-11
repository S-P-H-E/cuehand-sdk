import "dotenv/config";
import { google } from "@ai-sdk/google"
import { Cuehand } from "../src"

async function main() {
  const cuehand = new Cuehand({
    type: "LOCAL",
    model: google("gemini-1.5-flash"),
    headless: true,
  })

  await cuehand.init()

  // Change this to whatever site you want to experiment on
  await cuehand.goto("https://example.com")

  // Observe an element based on a natural language instruction
  const observed = await cuehand.observe("Find the main heading on the page")
  console.log("Observed:", observed)

  // Take a screenshot to confirm we are on the page
  await cuehand.screenshot("example.png")

  await cuehand.close()
}

main()

