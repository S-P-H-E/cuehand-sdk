import "dotenv/config";
import { google } from "@ai-sdk/google"
import { Cuehand } from "../src"

async function main() {
  const model = google("gemini-2.5-flash")

  const cuehand = new Cuehand({
    type: "LOCAL",
    model,
    headless: false
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

