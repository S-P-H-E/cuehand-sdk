import { Browser, chromium, LaunchOptions, BrowserContext, Page as PlaywrightPage } from "playwright";
import { Stagehand, Action, AgentConfig } from "@browserbasehq/stagehand";
import chalk from "chalk";
import ora from "ora";
import { z } from "zod";

interface CuehandBaseOptions {
    userDataDir?: string;
    model?: string; 
}

type CuehandOptions = (CuehandBaseOptions & { type: "LOCAL"; headless?: boolean }) | (CuehandBaseOptions & { type: "DOCKER"; headless?: true });

export class Cuehand {
    private browser!: Browser;
    public context!: BrowserContext;
    private options: CuehandOptions;
    private stagehand!: Stagehand;
    private page!: PlaywrightPage;
  
    constructor(options: CuehandOptions) {
        this.options = options;
    }

    async init() {

        const internalPlaywrightLaunchOptions: LaunchOptions = {
            headless: this.options.type === "DOCKER" ? true : this.options.headless ?? false,
            args: ['--remote-debugging-port=9222'],
        };
        
        let wsUrl: string;

        if (this.options.userDataDir) {
            // ! add logging here
            
            this.context = await chromium.launchPersistentContext(
                this.options.userDataDir,
                internalPlaywrightLaunchOptions
            );

            // Ensure there's at least one page, using Playwright's newPage
            this.page = this.context.pages()[0] ?? await this.context.newPage();

            // ! add logging here
            const response = await fetch(`http://localhost:9222/json/version`);
            const data = await response.json();
            wsUrl = data.webSocketDebuggerUrl;

            console.log(`${chalk.green("[INFO]")} Persistent session loaded ${chalk.gray(this.options.userDataDir)}`);
        } else {
            // ! add logging here
            
            this.browser = await chromium.launch(internalPlaywrightLaunchOptions);
            this.context = await this.browser.newContext();
            this.page = await this.context.newPage();

            // ! add logging here
            const response = await fetch(`http://localhost:9222/json/version`);
            const data = await response.json();
            wsUrl = data.webSocketDebuggerUrl;

            console.log(`${chalk.green("[INFO]")} Browser launched`);
        }

        // ! add logging here
        this.stagehand = new Stagehand({ 
            env: "LOCAL",
            localBrowserLaunchOptions: {
                cdpUrl: wsUrl,
            },
            model: this.options.model,
            verbose: 0,
        });

        await this.stagehand.init();

        // this.page = this.stagehand.context.pages()[0] ?? this.page;

        // ! add logging here
    }

    async goto(url: string) {
        await this.page.goto(url);
        console.log(`${chalk.green("[INFO]")} Navigated to ${chalk.cyan(url)}`);
    }

    async act(instruction: string | Action) {
        if (typeof instruction === "string") {
            await this.stagehand.act(instruction);
        } else {
            await this.stagehand.act(instruction);
        }
        console.log(`${chalk.green("[INFO]")} Performed action: ${chalk.cyan(typeof instruction === "string" ? instruction : instruction.description.toLowerCase())}`);
    }

    async observe(instruction: string) {
        const [action] = await this.stagehand.observe(instruction);
        console.log(`${chalk.green("[INFO]")} Observed action: ${chalk.cyan(instruction)}`);

        return [action] as [Action];
    }

    async extract<T extends z.ZodTypeAny | undefined = undefined>(
        instruction: string,
        schema?: T
    ): Promise<T extends z.ZodTypeAny ? z.infer<T> : { extraction: string }> {
        console.log(
            `${chalk.green("[INFO]")} Extracting: ${chalk.cyan(instruction)}`
        );
        
        if (schema) {
            return await this.stagehand.extract(instruction, schema);
        }
        
        // Type assertion is often needed here as TS struggles to narrow generic conditional returns inside the body
        return (await this.stagehand.extract(instruction)) as any;
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

    public agent(options: AgentConfig) {
        console.log(`${chalk.green("[INFO]")} Initializing Agent`);
        const agentInstance = this.stagehand.agent(options);

        return {
            execute: async (instruction: { instruction: string; maxSteps?: number; highlightCursor?: boolean }) => {
                const spinner = ora({
                    text: "Agent executing instructions...",
                    prefixText: chalk.blue("[AGENT]"),
                }).start();

                try {
                    const result = await agentInstance.execute(instruction);
                    spinner.succeed(`${chalk.green("[INFO]")} Agent execution complete`);
                    return result;
                } catch (error) {
                    spinner.fail(`${chalk.red("[ERROR]")} Agent execution failed`);
                    throw error;
                }
            },
        };
    }

    async close() {
        const spinner = ora('Closing browser and Stagehand...').start();
        if (this.stagehand) {
            await this.stagehand.close();
        }
        if (this.browser) {
            await this.browser.close();
        }
        if (this.context && !this.browser) {
            await this.context.close();
        }
        spinner.succeed(`${chalk.green("[INFO]")} Browser and Stagehand closed.`);
    }
}