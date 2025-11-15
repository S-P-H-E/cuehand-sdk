import ora from "ora";
import chalk from "chalk";
import { Browser, BrowserContext, Locator, Page } from "playwright";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import z from "zod";
import { ActOptions, AIModel } from "./Cuehand";

// ──────────────────────────────────────────────────────────────
// GOTO
// ──────────────────────────────────────────────────────────────

async function goto(page: Page, url: string) {
  await page.goto(url);
  console.log(`${chalk.green("[INFO]")} Navigated to ${chalk.cyan(url)}`);
}

// ──────────────────────────────────────────────────────────────
// CLOSE
// ──────────────────────────────────────────────────────────────

async function close(context: BrowserContext, browser: Browser) {
  if (context) {
    await context.close();
    console.log(`${chalk.green("[INFO]")} Context closed, state persisted`);
  }
  if (browser) {
    await browser.close();
    console.log(`${chalk.green("[INFO]")} Browser closed`);
  }
}

// ──────────────────────────────────────────────────────────────
// WAIT
// ──────────────────────────────────────────────────────────────

async function wait(seconds: number) {
  const spinner = ora({
    text: `Waiting for ${seconds} seconds...`,
    spinner: "dots",
    prefixText: `${chalk.yellow("[DELAY]")}`,
  }).start();

  await new Promise((res) => setTimeout(res, seconds * 1000));
  spinner.succeed(`Waited ${seconds} seconds`);
}

// ──────────────────────────────────────────────────────────────
// ACT
// ──────────────────────────────────────────────────────────────
async function act(instruction: string, page: Page, model: AIModel, options?: ActOptions) {
    if (options?.variables) {
      for (const [key, value] of Object.entries(options.variables)) {
        instruction = instruction.split(`%${key}%`).join(value);
      }
    }
  
    const { object: action } = await generateObject({
      model,
      system: `
        Extract intent.
        targetText: exact case-sensitive text (e.g., 'Log in', 'Username')
        role: button | link | textbox
        action: click | fill
        value: for fill actions
        index: for positional access (0=first, 1=second)
      `,
      prompt: instruction,
      schema: z.object({
        targetText: z.string(),
        role: z.string(),
        action: z.enum(["click", "fill"]),
        value: z.string().optional(),
        index: z.number().optional(),
      }),
    });
  
    console.log(`${chalk.magenta("[AI]")} Intention:`);
    console.log(`\tTarget: ${chalk.gray(action.targetText)}`);
    console.log(`\tRole: ${chalk.gray(action.role)}`);
    console.log(`\tAction: ${chalk.gray(action.action)}`);
    if (action.value) console.log(`\tValue: ${chalk.gray(action.value)}`);
    if (action.index !== undefined)
      console.log(`\tIndex: ${chalk.gray(action.index)}`);
  
    const role = action.role.toLowerCase();
  
    // Exact match only
    let locator = page.getByRole(role as any, {
      name: action.targetText,
      exact: true,
    });
  
    if (action.index !== undefined) locator = locator.nth(action.index);
  
    if ((await locator.count()) === 0) {
      console.error(
        `${chalk.red("[ERROR]")} Not found: '${chalk.red(
          action.targetText
        )}' (${role})`
      );
      process.exit(1);
    }
  
    if (action.action === "click") {
      await locator.click();
      console.log(`${chalk.blue("[ACT]")} Clicked '${chalk.blue(action.targetText)}'`);
    } else {
      await locator.fill(action.value!);
      console.log(
        `${chalk.blue("[ACT]")} Filled '${chalk.blue(
          action.targetText
        )}' with '${chalk.blue(action.value)}'`
      );
    }
}

// ──────────────────────────────────────────────────────────────
// OBSERVE
// ──────────────────────────────────────────────────────────────
async function observe(instruction: string, page: Page, model: AIModel) {
    const { object: query } = await generateObject({
      model,
      system: `
        Extract intent.
        targetText: exact case-sensitive text
        role: button | link | textbox
        index: for positional access
      `,
      prompt: instruction,
      schema: z.object({
        targetText: z.string(),
        role: z.string(),
        index: z.number().optional(),
      }),
    });
  
    console.log(`${chalk.magenta("[AI]")} Query:`);
    console.log(`\tTarget: ${chalk.gray(query.targetText)}`);
    console.log(`\tRole: ${chalk.gray(query.role)}`);
    if (query.index !== undefined)
      console.log(`\tIndex: ${chalk.gray(query.index)}`);
  
    const role = query.role.toLowerCase();
  
    let locator = page.getByRole(role as any, {
      name: query.targetText,
      exact: true,
    });
  
    if (query.index !== undefined) locator = locator.nth(query.index);
  
    const found = (await locator.count()) > 0;
  
    if (found) {
      console.log(
        `${chalk.blue("[OBSERVE]")} Found '${chalk.blue(query.targetText)}'`
      );
    } else {
      console.log(
        `${chalk.red("[ERROR]")} Not found: '${chalk.red(query.targetText)}'`
      );
    }
  
    return found;
}

export { act, close, goto, wait, observe };