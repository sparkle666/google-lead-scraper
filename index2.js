import puppeteer from 'puppeteer';
import { extractContactInfo, writeCSVAsync, readNamesFromFile } from './utils.js';
import fs from 'fs';
import { format } from 'fast-csv';

console.log("MAKE SURE TO COPY CONTENTS OF OUTPUT.CSV SINCE IT OVERWRITES ON EVERY RUN...");

const filePath = 'company_names.txt'; // Replace with the path to your text file

const DATA = [];
const BATCH_SIZE = 3;


const runBot = async () => {
  // Load list of company names to scrape
  const names = readNamesFromFile(filePath);
  
  // Launch the browser
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-infobars',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-crash-upload',
      '--safebrowsing-disable-auto-update',
      '--disable-logging',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      '--disable-software-rasterizer',
    ],
  });

  try {
    // Function to process each name
    const processName = async (name) => {
      try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1024 });

        // Block images and other unnecessary requests
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
            request.abort();
          } else {
            request.continue();
          }
        });

        console.log(`Searching for: ${name}`);
        await page.goto('https://www.google.com/');

        // Type the name and query for email and contact
        await page.type("#APjFqb", `${name} ivory coast website, email, and contact details` + String.fromCharCode(13));

        await page.waitForSelector('.MjjYud', { timeout: 30000 }); // Adjust timeout if necessary

        const results = await page.evaluate(() => {
          const items = Array.from(document.getElementsByClassName("MjjYud"));
          return items.map(item => {
            const anchorTag = item.querySelector('a[jsname="UWckNb"]');
            const href = anchorTag ? anchorTag.href : null;

            const divTag = item.querySelector('div.kb0PBd.cvP2Ce.A9Y9g[data-snf="nke7rc"] div.VwiC3b.yXK7lf.lVm3ye.r025kc.hJNv6b.Hdw6tb');
            const divText = divTag ? divTag.innerText : null;

            return { href, divText };
          });
        });

        await page.close();

        // Get all hrefs and remove null values
        const filteredLinks = results.map(item => item.href).filter(Boolean).slice(0, 2);
        const filteredText = results.map(item => item.divText).filter(Boolean);

        // Extract contact from filteredText
        const contactObjects = extractContactInfo(filteredText);
        contactObjects["urls"] = filteredLinks;
        contactObjects.name = name;

        console.log(contactObjects);

        // Push the extracted contact to the DATA array
        DATA.push(contactObjects);
      } catch (error) {
        console.error(`Error processing ${name}: ${error.message}`);
      }
    };


    for (let i = 0; i < names.length; i += BATCH_SIZE) {

      const batch = names.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(name => processName(name)));

      console.log("Current name index: ", i);

      if ((i + BATCH_SIZE) % 10 === 0 && i !== 0) {
        // Write to CSV after every 10 names
        await writeCSVAsync(DATA, true);
        console.log(`Written ${i + BATCH_SIZE} scraped data to csv...`);
        // Clear data
        DATA.length = 0;
      }
    }
    // Write the remaining data to csv not included in the last batch
    console.log("Written the rest of DATA to csv...")
    await writeCSVAsync(DATA, true);

    await browser.close();
  } catch (e) {
    console.log("Error occurred... Saving already scraped data");
    if (DATA.length > 0) {
      // Write the contents to CSV once
      await writeCSVAsync(DATA, true);
    }
  }
};

runBot();
