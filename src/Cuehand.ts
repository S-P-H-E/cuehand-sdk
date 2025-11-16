import { Browser, chromium, Page, LaunchOptions, BrowserContext } from "playwright";
import chalk from "chalk";
import ora from "ora";

interface CuehandBaseOptions {
    userDataDir?: string;
}

type CuehandOptions = (CuehandBaseOptions & { type: "LOCAL"; headless?: boolean }) | (CuehandBaseOptions & { type: "DOCKER"; headless?: true });

export class Cuehand {
  private browser!: Browser;
  public context!: BrowserContext;
  private page!: Page;
  private options: CuehandOptions;

  constructor(options: CuehandOptions) {
      this.options = options;
  }
    
  async init() {
      const headless = this.options.type === "DOCKER" ? true : this.options.headless ?? false;
      const launchOptions: LaunchOptions = { headless };
      if (this.options.userDataDir) {
              this.context = await chromium.launchPersistentContext(
              this.options.userDataDir,
              launchOptions
          );
          this.page = this.context.pages()[0] ?? await this.context.newPage();
          
          console.log(`${chalk.green("[INFO]")} Persistent session loaded ${chalk.gray(this.options.userDataDir)}`);
          return;
      }
      this.browser = await chromium.launch(launchOptions);
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();

      console.log(`${chalk.green("[INFO]")} Browser launched`);
  }
    
  async goto(url: string) {
    await this.page.goto(url);
    console.log(`${chalk.green("[INFO]")} Navigated to ${chalk.cyan(url)}`);
  }

  async wait(seconds: number) {
    const spinner = ora({
      text: `Waiting for ${seconds} seconds...`,
      spinner: "dots",
      prefixText: `${chalk.yellow("[DELAY]")}`,
    }).start();
  
    await new Promise((res) => setTimeout(res, seconds * 1000));
    spinner.succeed(`Waited ${seconds} seconds`);
  }

  async close() {
    if (this.context) {
      await this.context.close();
      console.log(`${chalk.green("[INFO]")} Context closed, state persisted`);
    }
    if (this.browser) {
      await this.browser.close();
      console.log(`${chalk.green("[INFO]")} Browser closed`);
    }
  }
}