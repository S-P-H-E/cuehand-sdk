import { LanguageModel } from "ai";
import { Browser, chromium, Page, LaunchOptions, BrowserContext } from "playwright";
import { act, close, goto, observe, wait } from "./actions";
import chalk from "chalk";

export type AIModel = LanguageModel | string;

interface CuehandBaseOptions {
    model: AIModel;
    userDataDir?: string; // persistent profile path
}

type CuehandOptions =
  | (CuehandBaseOptions & { type: "LOCAL"; headless?: boolean })
  | (CuehandBaseOptions & { type: "DOCKER"; headless?: true });

// Optional variables for the act() LLM step
export interface ActOptions {
    variables?: Record<string, string>;
}

export class Cuehand {
    private browser!: Browser;
    public context!: BrowserContext;
    private page!: Page;
    private options: CuehandOptions;

    constructor(options: CuehandOptions) {
        // Store user options internally
        this.options = options;
    }

    // ────────────────────────────────────────────
    // ✔ Start Playwright browser
    // ────────────────────────────────────────────

    async init() {
        // Decide headless mode:
        // - LOCAL defaults to headful (headless: false)
        // - DOCKER must be headless (true)
        const headless = this.options.type === "DOCKER" ? true : this.options.headless ?? false;
        const launchOptions: LaunchOptions = { headless };
        // ────────────────────────────────────────────────
        // ✔ Persistent Context (userDataDir)
        // - Behaves exactly like Puppeteer’s userDataDir
        // ────────────────────────────────────────────────
        if (this.options.userDataDir) {
            // Create persistent browser profile
                this.context = await chromium.launchPersistentContext(
                this.options.userDataDir,
                launchOptions
            );
    
            // Try to use the first page, otherwise create one
            this.page = this.context.pages()[0] ?? await this.context.newPage();

            console.log(`${chalk.green("[INFO]")} Persistent session loaded ${chalk.gray(this.options.userDataDir)}`);
            return;
        }
    
        // ────────────────────────────────────────────────
        // ✔ Normal (non‑persistent) browser
        // ────────────────────────────────────────────────
        this.browser = await chromium.launch(launchOptions);
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
    
        console.log(`${chalk.green("[INFO]")} Browser launched`);
    }

    // ────────────────────────────────────────────
    // EXPOSE ACTIONS
    // ────────────────────────────────────────────
    async goto(url: string) {
        await goto(this.page, url);
    }

    async wait(seconds: number) {
        await wait(seconds);
    }

    async act(instruction: string, options?: ActOptions) {
        await act(instruction, this.page, this.options.model, options);
    }

    async observe(instruction: string) {
        return await observe(instruction, this.page, this.options.model);
    }

    async close() {
        await close(this.context, this.browser);
    }
}