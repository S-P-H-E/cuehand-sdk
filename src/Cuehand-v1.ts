// import "dotenv/config";
// import { google } from "@ai-sdk/google";
// import { generateObject } from "ai";
// import StealthPlugin from "puppeteer-extra-plugin-stealth";
// import { executablePath, Browser, Page, LaunchOptions, KeyInput } from "puppeteer";
// import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
// import puppeteer from "puppeteer-extra";
// import { z } from "zod";
// import { JSDOM } from 'jsdom';

// puppeteer.use(StealthPlugin());
// puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// type ScreenshotOptions = Parameters<typeof Page.prototype.screenshot>[0];

// export type CuehandType = "LOCAL" | "DOCKER";

// // Act options type
// interface ActOptions {
//     variables?: Record<string, string>;
// }

// // Act result type
// export interface ActResult {
//     success: boolean;
//     message: string;
// }

// // Model type from Vercel SDK
// type GoogleModelReturn = ReturnType<typeof google> | string;

// type CuehandOptions =
//   | (LaunchOptions & { type: "DOCKER"; model: GoogleModelReturn; headless?: true })
//   | (LaunchOptions & { type: "LOCAL"; model: GoogleModelReturn; headless?: boolean });

// export class Cuehand {
//     private browser!: Browser;
//     private page!: Page;
//     private options: CuehandOptions;

//     constructor(options: CuehandOptions) {
//         // Set defaults based on type
//         if (options.type === "LOCAL") {
//             // Default headless = false for LOCAL
//             this.options = {
//                 ...options,
//                 headless: options.headless ?? false,
//                 executablePath: executablePath(),
//             };
//         } else {
//             // DOCKER must be headless (true)
//             this.options = {
//                 ...options,
//                 headless: true,
//                 executablePath: executablePath(),
//             };
//         }
//     }
    
//     // Only launch browser here
//     async init() {
//         const launchOptions: LaunchOptions = { ...this.options };

//         if (this.options.type === "DOCKER") {
//             // Add Docker-specific args
//             launchOptions.args = [
//                 "--no-sandbox",
//                 "--disable-setuid-sandbox",
//                 "--disable-dev-shm-usage",
//                 ...(launchOptions.args || []),
//             ];
//         }

//         // Optional: make the viewport fill the screen
//         launchOptions.defaultViewport = null;


//         this.browser = await puppeteer.launch(launchOptions);
//         // this.page = await this.browser.newPage();
//         // Grab the first default blank page
//         const pages = await this.browser.pages();
//         this.page = pages[0];
        
//         console.log(`🚀 Browser launched '${this.options.type}'`);
//     }

//     async goto(url: string) {
//         await this.page.goto(url, { waitUntil: "networkidle2"});
//         console.log(`🌐 Navigated to '${url}'`);
//     }

//     // Helper method to wrap generateObject and handle errors
//     private async safeGenerateObject<T>(config: Parameters<typeof generateObject>[0]): Promise<T> {
//         const result = await generateObject(config).catch((error: unknown) => {
//             const errorMessage = error instanceof Error ? error.message : String(error)
//             // Write clean error message and exit immediately to prevent Node.js from printing stack trace
//             process.stderr.write(`❌ AI SDK Error: ${errorMessage}\n`)
//             process.exit(1)
//             // Never reached, but satisfies TypeScript
//             throw new Error(errorMessage)
//         })
//         return result.object as T
//     }

//     async act(instruction: string, options?: ActOptions) {
//         // Replace placeholders with provided variables
//         if (options?.variables) {
//             for (const [key, value] of Object.entries(options.variables)) {
//                 instruction = instruction.split(`%${key}%`).join(value);
//             }
//         }

//         async function filterHTMLByKeyword(
//             page: Page,
//             keyword: string,
//             tags: string[]
//           ): Promise<string> {
//             const content = await page.content();
//             const dom = new JSDOM(content);
//             const doc: Document = dom.window.document;
          
//             const filtered: string[] = [];
//             const selector = tags.join(',');
            
//             doc.querySelectorAll(selector).forEach((el: Element) => {
//               const name: string = el.getAttribute('name') || '';
//               const placeholder: string = el.getAttribute('placeholder') || '';
//               const ariaLabel: string = el.getAttribute('aria-label') || '';
//               const textContent: string = el.textContent || '';
          
//               const combined: string = `${name} ${placeholder} ${ariaLabel} ${textContent}`.toLowerCase();
          
//               if (combined.includes(keyword.toLowerCase())) {
//                 filtered.push(el.outerHTML);
//               }
//             });
          
//             return filtered.join('\n---\n');
//         }

//         const executeAction = async () => {
//             const keywordObject = await this.safeGenerateObject<{ keyword: string, tags: string[] }>({
//                 model: this.options.model,
//                 system: `
//                     You are an expert at picking the best keyword from an instruction. 
//                     A keyword is a word that can be search out of multiple other's to determine the best element. 
//                     E.g "Find the login button" the keyword is "login". E.g "Find the email field" the keyword is "email".

//                     Based on the instruction, you will need to pick the best tags to filter the HTML content.
//                     Let's say the keyword is "login", a login keyword can only really be found in the following tags: 
//                     input, button, a, h1 (and the rest of the heading tags) span, p.
//                     So you will need to pick the best tags to filter the HTML content.

//                     Remember to be accurate with the keyword if the user passes in 'Log in' the keyword becomes Log in and not login.
//                     Keywords are only one word. Unless otherwise stated by the user, e.g 'Log in' vs login.
//                 `,
//                 prompt: `Instruction: ${instruction}`,
//                 schema: z.object({
//                     keyword: z.string(),
//                     tags: z.array(z.string()),
//                 })
//             })

//             console.log(`🔍 Keyword: ${keywordObject.keyword}`);
//             console.log(`🔍 Tags: ${keywordObject.tags}`);

//             const content = await filterHTMLByKeyword(this.page, keywordObject.keyword, keywordObject.tags);
//             console.log(`🔍 Content: ${content}`);

//             const selectorObject = await this.safeGenerateObject<{ selector: string }>({
//                 model: this.options.model,
//                 system: `
//                     You are an expert at picking Puppeteer selectors for clickable elements.
        
//                     IMPORTANT: If the element itself is not clickable (like a span or div), 
//                     find its clickable parent (button, a, [role="button"], etc).
                    
//                     Use XPath to traverse up the DOM tree with ancestor::
//                     Example: xpath=//span[contains(text(), "Search")]/ancestor::button
                    
//                     Only generate selectors in these formats:
//                     1. CSS: button.class, a[href], input[name="username"]
//                     2. XPath with ancestors: xpath=//span[contains(text(), "Search")]/ancestor::button
                    
//                     If finding by text, use: xpath=//*[contains(text(), "Search")]
//                     - Find input by name: input[name="username"]

//                     Return ONLY the selector string, nothing else.
//                 `,
//                 prompt: `Content: ${content}, Instruction: ${instruction}`,
//                 schema: z.object({
//                     selector: z.string().min(1, "Selector cannot be empty"),
//                 })
//             })

//             console.log(`📍 Generated selector: ${selectorObject.selector}`);

//             const actionObject = await this.safeGenerateObject<{ action: "click" | "fill" | "locate"; value?: string }>({
//                 model: this.options.model,
//                 system: `
//                     You are an expert at picking puppeteer actions to perform on a webpage.
//                     You will be given an instruction and you will need to pick the appropriate puppeteer action to perform.

//                     The actions you can perform are:
//                     - click: click on the element
//                     - fill: fill the element with the value (this is the only action that requires a value)
//                     - locate: locate the element
//                 `,
//                 prompt: `Instruction: ${instruction}`,
//                 schema: z.object({
//                     action: z.enum(["click", "fill", "locate"]),
//                     value: z.string().optional(),
//                 })
//             })

//             switch (actionObject.action) {
//                 case "click": {
//                     const clickPromise = this.page.locator(selectorObject.selector).click().then(() => {
//                         console.log(`👆 Clicked on '${selectorObject.selector}'`);
//                         return { success: true, message: "Action completed successfully" } as ActResult;
//                     }).catch((err: Error) => {
//                         return { 
//                             success: false, 
//                             message: `Action failed: ${err.message}. The instruction "${instruction}" could not be executed.` 
//                         } as ActResult;
//                     });
//                     return await clickPromise;
//                 }
//                 case "fill": {
//                     const fillPromise = this.page.locator(selectorObject.selector).fill(actionObject.value ?? "").then(async () => {
//                         await this.wait(1);
//                         console.log(`👆 Filled '${selectorObject.selector}' with '${actionObject.value ?? ""}'`);
//                         return { success: true, message: "Action completed successfully" } as ActResult;
//                     }).catch((err: Error) => {
//                         return { 
//                             success: false, 
//                             message: `Action failed: ${err.message}. The instruction "${instruction}" could not be executed.` 
//                         } as ActResult;
//                     });
//                     return await fillPromise;
//                 }
//                 case "locate":
//                     this.page.locator(selectorObject.selector);
//                     console.log(`👆 Located '${selectorObject.selector}'`);
//                     return { success: true, message: "Action completed successfully" };
//             }
//         }

//         executeAction();
//     }

//     async wait(seconds: number) {
//         console.log(`🕒 Waiting for ${seconds} seconds`);
//         await new Promise(resolve => setTimeout(resolve, seconds * 1000));
//     }

//     async press(key: KeyInput) {
//         await this.page.keyboard.press(key);
//         console.log(`👆 Pressed '${key}'`);
//     }

//     async content() {
//         console.log("🔍 Getting content")
//         const rawContent = await this.page.content()
//         let processed = rawContent
//         processed = processed.replace(/<!--[\s\S]*?-->/g, '')
//         processed = processed.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
//         // ! for now we will not remove svg tags
//         // processed = processed.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
//         processed = processed.replace(/<(link|meta)[^>]*>/gi, '')
//         const tagsToRemove = ['html', 'body', /* 'div', 'span',*/ 'section', 'main', 'header', 'footer', 'nav']
//         tagsToRemove.forEach(tag => {
//             const openTagPattern = new RegExp(`<${tag}\\b[^>]*>`, 'gi')
//             const closeTagPattern = new RegExp(`</${tag}>`, 'gi')
//             processed = processed.replace(openTagPattern, '')
//             processed = processed.replace(closeTagPattern, '')
//         })
//         processed = processed
//             .split('\n')
//             .filter(line => line.trim().length > 0)
//             .join('\n')
        
//         return processed
//     }

//     async close() {
//         await this.browser.close();
//         console.log("🛑 Browser closed");
//     }

//     async screenshot({ path, options }: { path?: `${string}.png` | `${string}.jpeg` | `${string}.webp`, options?: ScreenshotOptions }) {
//         if (path !== undefined) {
//             await this.page.screenshot({ path });
//             console.log(`📸 Screenshot taken to '${path}'`);
//             return "Screenshot Taken";
//         } else {
//             const screenshot = await this.page.screenshot({ ...options });
//             console.log("📸 Screenshot taken");
//             return screenshot;
//         }
//     }

//     async observe(instruction: string) {
//         const content = await this.content();

//         const selectorObject = await this.safeGenerateObject<{ action?: { found?: boolean } }>({
//             model: this.options.model,
//             system: `
//                 You are an expert at picking the appropriate puppeteer selector to perform an action on a webpage.
    
//                 If the element is found, return true if not return false.
//             `,
//             prompt: `Content: ${content}, Instruction: ${instruction}`,
//             schema: z.object({
//                 action: z.object({
//                     found: z.boolean().optional(),
//                 }).optional(),
//             }),
//         });
    
//         return { found: selectorObject?.action?.found };       
//     }

//     async record(path: `${string}.mp4`) {
//         await this.page.screencast({ path });
//         console.log(`📺 Screencast recorded to '${path}'`);
//     }

//     // Filter HTML content by specific tag type
//     private async filterContentByTag(tagName: string): Promise<string> {
//         const filtered = await this.page.evaluate((tag) => {
//             const elements = document.body.querySelectorAll(tag)
//             if (elements.length === 0) return ''
            
//             const container = document.createElement('div')
//             elements.forEach(el => {
//                 const cloned = el.cloneNode(true) as HTMLElement
//                 container.appendChild(cloned)
//             })
            
//             return container.innerHTML
//         }, tagName)
        
//         return filtered
//     }

//     async extract<T extends z.ZodTypeAny>(instruction: string, schema: T): Promise<z.infer<T>> {
//         let content = await this.content()

//         // Detect tag type from instruction and filter content
//         const instructionLower = instruction.toLowerCase()
//         let tagType: string | null = null
//         const hasWord = (word: string) => new RegExp(`\\b${word}s?\\b`).test(instructionLower)

//         // Use switch statement to detect tag keywords in instruction
//         switch (true) {
//             case hasWord('link'):
//                 tagType = 'a'
//                 break
//             case hasWord('button'):
//                 tagType = 'button'
//                 break
//             case hasWord('input'):
//                 tagType = 'input'
//                 break
//             case hasWord('form'):
//                 tagType = 'form'
//                 break
//             case hasWord('image') || instructionLower.includes('img'):
//                 tagType = 'img'
//                 break
//             case hasWord('heading') || instructionLower.includes('h1') || instructionLower.includes('h2') || instructionLower.includes('h3') || instructionLower.includes('h4') || instructionLower.includes('h5') || instructionLower.includes('h6'):
//                 tagType = 'h1, h2, h3, h4, h5, h6'
//                 break
//             case hasWord('paragraph') || instructionLower.includes('p'):
//                 tagType = 'p'
//                 break
//             case hasWord('div'):
//                 tagType = 'div'
//                 break
//             case hasWord('span'):
//                 tagType = 'span'
//                 break
//             case hasWord('table'):
//                 tagType = 'table'
//                 break
//             case hasWord('list') || instructionLower.includes('ul') || instructionLower.includes('ol'):
//                 tagType = 'ul, ol'
//                 break
//         }

//         // Filter content if tag type is detected
//         if (tagType) {
//             content = await this.filterContentByTag(tagType)
//             console.log(`🔍 Filtered content by tag: ${tagType}`)
//         }

    
//         const object = await this.safeGenerateObject<z.infer<T>>({
//             model: this.options.model,
//             system: `
//                 You are an expert web content extraction agent.
//                 You are given an instruction and the HTML of a webpage.
//                 Your task is to extract only the requested structured data, matching the provided schema exactly.
//                 Be concise, precise, and return only relevant information.
//             `,
//             prompt: `
//                 Instruction: ${instruction}
//                 HTML Content: ${content}
//             `,
//             schema
//         });
    
//         console.log("📦 Extracted data");
//         return object;
//     }
// }

export const CuehandV1 = () => {}