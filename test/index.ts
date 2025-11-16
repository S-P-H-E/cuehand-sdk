import "dotenv/config";
import { Cuehand } from "../src/Cuehand.ts"

async function main() {
  const cuehand = new Cuehand({
    type: "LOCAL",
    userDataDir: "./userData",
    headless: true,
  })

  await cuehand.init()

  await cuehand.goto("https://www.instagram.com");

  await cuehand.wait(1);
}

main()