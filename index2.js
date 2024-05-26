import puppeteer from 'puppeteer';
import { extractContactInfo, writeCSV, readNamesFromFile } from './utils.js';

console.log("MAKE SURE TO COPY CONTENTS OF OUTPUT.CSV SINCE IT OVERWRITES ON EVERY RUN...");

const filePath = 'company_names.txt'; // Replace with the path to your text file

const DATA = [];

const runBot = async () => {
  // Load list of company names to scrape
  const names = readNamesFromFile(filePath);
  
  // Launch the browser
  const browser = await puppeteer.launch({ headless: false });

  // Function to process each name
  const processName = async (name) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1024 });

    console.log(`Searching for: ${name}`);
    await page.goto('https://www.google.com/');

    // Type the name and query for email and contact
    await page.type("#APjFqb", `${name} email and contact` + String.fromCharCode(13));

    await page.waitForNavigation();

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
    const filteredLinks = results.map(item => item.href).filter(Boolean).slice(0, 3);
    const filteredText = results.map(item => item.divText).filter(Boolean);

    // Extract contact from filteredText
    const contactObjects = extractContactInfo(filteredText);
    contactObjects["urls"] = filteredLinks;
    contactObjects.name = name;

    console.log(contactObjects);

    // Push the extracted contact to the DATA array
    DATA.push(contactObjects);
  };

  // Process names in parallel with a limit of concurrent pages
  const BATCH_SIZE = 5;
  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(name => processName(name)));
  }

  // Write the contents to CSV once
  writeCSV(DATA, true);

  await browser.close();
};

runBot();
