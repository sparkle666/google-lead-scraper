import puppeteer from 'puppeteer';
import { extractContactInfo, writeCSV, readNamesFromFile } from './utils.js';

console.log("MAKE SURE TO COPY CONTENTS OF OUTPUT.CSV SINCE IT OVERWRITES ON EVERY RUN...");

const filePath = 'company_names.txt'; // Replace with the path to your text file

const DATA = [];


const runBot = async () => {
  // Load list of company names to scrap
  const names = readNamesFromFile(filePath);
  // Launch the browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

  for (const name of names) {
    console.log(`Searching for: ${name}`);
    await page.goto('https://www.google.com/');
    
    // Type the name and query for email and contact
    await page.type("#APjFqb", `${name} email and contact` + String.fromCharCode(13));

    await page.waitForNavigation();

    const htmlContent = await page.content();

    const results = await page.evaluate(() => {
      const items = Array.from(document.getElementsByClassName("MjjYud"));
      const data = [];

      items.forEach(item => {
        const anchorTag = item.querySelector('a[jsname="UWckNb"]');
        const href = anchorTag ? anchorTag.href : null;

        const divTag = item.querySelector('div.kb0PBd.cvP2Ce.A9Y9g[data-snf="nke7rc"] div.VwiC3b.yXK7lf.lVm3ye.r025kc.hJNv6b.Hdw6tb');
        const divText = divTag ? divTag.innerText : null;

        data.push({ href, divText });
      });
      return data;
    });

    // Get all hrefs and remove null values
    const allLinks = [];
    const allDivText = [];

    results.forEach(item => {
      if (item.href) allLinks.push(item.href);
      if (item.divText) allDivText.push(item.divText);
    });

    const filteredLinks = allLinks.slice(0, 3); // Get the first 3 links
    const filteredText = allDivText; // All texts

    // Extract contact from filteredText
    const contactObjects = extractContactInfo(filteredText);

    contactObjects["urls"] = filteredLinks;
    contactObjects.name = name;

    console.log(contactObjects)

    // Push the extracted contact to the DATA array
    DATA.push(contactObjects);
    writeCSV(DATA, true);
  }

  // Write the contents to csv
  

  await browser.close();
};

runBot();
