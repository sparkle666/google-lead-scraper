import puppeteer from 'puppeteer';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Parser } from '@json2csv/plainjs';

// ===== CONFIGURATION CONSTANTS =====

// URLs
const BASE_URL = 'https://freighteva.com';
const ADMIN_URL = `${BASE_URL}/admin/`;
const ADD_ACCOUNT_URL = `${ADMIN_URL}index.php?controller=accounts&action=add`;

// Files & Paths
const COOKIES_FILE = './freighteva_cookies.json';
const OUTPUT_FILE_COMPLETE = './freighteva_accounts_complete.csv';
const OUTPUT_FILE_PARTIAL = './freighteva_accounts_partial.csv';
const OUTPUT_FILE_ERRORS = './freighteva_accounts_errors.csv';
const INPUT_CSV_PATH = './companies2.csv';

// Account Settings
const STARTING_ACCOUNT_ID = 641;

// Password Generation
const PASSWORD_LENGTH = 12;
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

// Timeouts & Delays (in milliseconds) - OPTIMIZED
const DELAYS = {
  shortDelay: 500,      // Reduced from 1000
  mediumDelay: 1000,    // Reduced from 2000
  longDelay: 2000       // Reduced from 5000
};

// Browser Settings
const BROWSER_CONFIG = {
  headless: false,
  protocolTimeout: 120000, // 2 minutes (default is 30s) - INCREASE IF STILL TIMING OUT
  defaultViewport: { width: 1280, height: 800 },
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
};

// CONCURRENCY CONTROL - CONFIGURE HERE
const MAX_CONCURRENT_TABS = 1; // Change this to control number of parallel tabs

// Login Credentials (consider using environment variables for security)
const LOGIN_CREDENTIALS = {
  username: 'admin',
  password: 'Respectmart123'
};

const usedPageNames = new Set();

// Account Settings
const ACCOUNT_TYPE_LOGISTICS = '19'; // Logistics Professional

// Form Selectors
const SELECTORS = {
  typeSelector: '#type_selector',
  locationInput: 'input[name="profile[location]"]',
  emailInput: 'input[name="profile[mail]"]',
  passwordInput: 'input[name="profile[password]"]',
  passwordRepeatInput: 'input[name="profile[password_repeat]"]',
  next1Button: '#next1 input[type="button"]',
  companyNameInput: 'input[name="f[company_name]"]',
  firstNameInput: 'input[name="f[First_name]"]',
  lastNameInput: 'input[name="f[Last_name]"]',
  countrySelect: 'select[name="f[country]"]',
  stateSelect: 'select[name="f[country_level1]"]',
  addressInput: 'input[name="f[address]"]',
  phoneInput: 'input.phone-field.iti__tel-input',
  websiteInput: 'input[name="f[website]"]',
  usernameInput: '#username',
  passwordField: '#password',
  loginButton: '#login_button',
  submitButton: 'input[type="submit"][value="Save"]',
  errorContainer: '#system_message .error'
};

// Country mapping from CSV to form values
const countryMapping = {
  'United States': 'countries_united_states',
  'U.S.A.': 'countries_united_states',
  'USA': 'countries_united_states',
  'United Kingdom': 'countries_united_kingdom',
  'UK': 'countries_united_kingdom',
  'China': 'countries_china',
  'Germany': 'countries_germany',
  'Singapore': 'countries_singapore',
  'Hong Kong': 'countries_hong_kong',
  'Australia': 'countries_australia',
  'Canada': 'countries_canada',
  'India': 'countries_india',
  'Japan': 'countries_japan',
  'France': 'countries_france',
  'Netherlands': 'countries_netherlands',
  'Spain': 'countries_spain',
  'Italy': 'countries_italy',
  'Brazil': 'countries_brazil',
  'Mexico': 'countries_mexico',
  'South Korea': 'countries_south_korea',
  'UAE': 'countries_united_arab_emirates',
  'U.A.E': 'countries_united_arab_emirates',
  'United Arab Emirates': 'countries_united_arab_emirates',
};

// Generate random password
function generatePassword() {
  let password = '';
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    password += PASSWORD_CHARS.charAt(Math.floor(Math.random() * PASSWORD_CHARS.length));
  }
  return password;
}

// Use email from CSV as-is
function getEmail(data) {
  return data.Email || '';
}

// Generate individual page name from company name
function generatePageName(companyName) {
  const words = companyName.trim().split(/\s+/);
  const firstTwoWords = words
    .slice(0, 3)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return firstTwoWords + Math.floor(1000 + Math.random() * 9000);
}

// Map country name to form value
function mapCountry(countryName) {
  const normalized = countryName.trim();
  return countryMapping[normalized] || 
         `countries_${normalized.toLowerCase().replace(/[^a-z]/g, '_')}`;
}

// Save cookies to file
async function saveCookies(page, filepath) {
  const cookies = await page.cookies();
  fs.writeFileSync(filepath, JSON.stringify(cookies, null, 2));
  console.log('🍪 Cookies saved');
}

// Load cookies from file
async function loadCookies(page, filepath) {
  if (fs.existsSync(filepath)) {
    const cookies = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    await page.setCookie(...cookies);
    return true;
  }
  return false;
}

// Login to the website (reusable for all tabs)
async function ensureLoggedIn(page) {
  const cookiesLoaded = await loadCookies(page, COOKIES_FILE);
  
  if (cookiesLoaded) {
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('input[name="username"]');
    });
    
    if (isLoggedIn) {
      return true;
    }
  }
  
  console.log('🔐 Logging in...');
  await page.goto(ADMIN_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  
  await page.type(SELECTORS.usernameInput, LOGIN_CREDENTIALS.username);
  await page.type(SELECTORS.passwordField, LOGIN_CREDENTIALS.password);
  await page.click(SELECTORS.loginButton);
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
  
  await saveCookies(page, COOKIES_FILE);
  console.log('✅ Logged in successfully');
  return true;
}

// Check for form errors
async function checkForErrors(page) {
  const errorInfo = await page.evaluate((selector) => {
    const errorDiv = document.querySelector(selector);
    if (!errorDiv) return null;
    
    const isVisible = window.getComputedStyle(errorDiv).display !== 'none';
    if (!isVisible) return null;
    
    const errorMessages = [];
    const listItems = errorDiv.querySelectorAll('li');
    listItems.forEach(li => {
      errorMessages.push(li.textContent.trim());
    });
    
    return {
      hasError: true,
      messages: errorMessages
    };
  }, SELECTORS.errorContainer);
  
  return errorInfo;
}

// Create account (optimized with faster waits)
async function createAccount(page, data, accountId, tabId) {
  const prefix = `[Tab ${tabId}]`;
  console.log(`${prefix} Creating: ${data['Company Name']}`);
  
  await page.goto(ADD_ACCOUNT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector(SELECTORS.typeSelector, { timeout: 15000 });
  
  await page.select(SELECTORS.typeSelector, ACCOUNT_TYPE_LOGISTICS);
  await page.waitForSelector(SELECTORS.locationInput, { visible: true, timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, DELAYS.shortDelay));
  
  const individualPage = generatePageName(data['Company Name']);
  const email = getEmail(data);
  const password = generatePassword();
  
  // Fast form filling using evaluate
  await page.evaluate((data, selectors) => {
    document.querySelector(selectors.locationInput).value = data.individualPage;
    document.querySelector(selectors.emailInput).value = data.email;
    document.querySelector(selectors.passwordInput).value = data.password;
    document.querySelector(selectors.passwordRepeatInput).value = data.password;
  }, { individualPage, email, password }, SELECTORS);
  
  await page.click(SELECTORS.next1Button);
  await page.waitForSelector(SELECTORS.companyNameInput, { visible: true, timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, DELAYS.shortDelay));
  
  // Fast form filling for company details
  await page.evaluate((data, selectors) => {
    document.querySelector(selectors.companyNameInput).value = data.companyName;
    document.querySelector(selectors.firstNameInput).value = data.companyName;
    document.querySelector(selectors.lastNameInput).value = data.companyName;
    if (data.address) {
      document.querySelector(selectors.addressInput).value = data.address;
    }
    if (data.website) {
      document.querySelector(selectors.websiteInput).value = data.website;
    }
  }, { 
    companyName: data['Company Name'],
    address: data.Address,
    website: data.Website
  }, SELECTORS);
  
  const countryValue = mapCountry(data.Country);
  await page.select(SELECTORS.countrySelect, countryValue);
  await new Promise(resolve => setTimeout(resolve, DELAYS.shortDelay));
  
  // Handle state/region
  try {
    const stateSelect = await page.$(SELECTORS.stateSelect);
    if (stateSelect) {
      const isDisabled = await page.evaluate(el => el.disabled, stateSelect);
      if (!isDisabled) {
        const firstOption = await page.evaluate(() => {
          const select = document.querySelector('select[name="f[country_level1]"]');
          const options = Array.from(select.options);
          return options.length > 1 ? options[1].value : options[0].value;
        });
        
        if (firstOption !== '0') {
          await page.select(SELECTORS.stateSelect, firstOption);
        }
      }
    }
  } catch (error) {
    // Silently continue
  }
  
  // Handle phone
  if (data.Phone) {
    await page.evaluate((phone, selector) => {
      const input = document.querySelector(selector);
      if (input) {
        input.focus();
        input.value = phone;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, data.Phone, SELECTORS.phoneInput);
    await new Promise(resolve => setTimeout(resolve, DELAYS.shortDelay));
  }
  
  await page.click(SELECTORS.submitButton);
  await new Promise(resolve => setTimeout(resolve, DELAYS.mediumDelay));
  
  const errorInfo = await checkForErrors(page);
  
  if (errorInfo && errorInfo.hasError) {
    console.log(`${prefix} ❌ Error: ${errorInfo.messages.join(', ')}`);
    return {
      success: false,
      error: errorInfo.messages.join(' | '),
      data: {
        'Country': data.Country,
        'City': data.City,
        'Company Name': data['Company Name'],
        'Address': data.Address,
        'Phone': data.Phone,
        'Website': data.Website,
        'Email': email,
        'Error': errorInfo.messages.join(' | ')
      }
    };
  }
  
  console.log(`${prefix} ✅ Created: ${email}`);
  
  return {
    success: true,
    data: {
      'Account ID': accountId,
      'Country': data.Country,
      'City': data.City, 
      'Company Name': data['Company Name'],
      'Address': data.Address,
      'Phone': data.Phone,
      'Website': data.Website,
      'Email': email,
      'Password': password,
      'Individual Page': `${BASE_URL}/${individualPage}/`
    }
  };
}

// Load existing results from CSV
function loadExistingResults(filename) {
  if (!fs.existsSync(filename)) {
    return [];
  }
  
  try {
    const csvContent = fs.readFileSync(filename, 'utf8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    return records;
  } catch (error) {
    return [];
  }
}

// Thread-safe CSV writing
let saveQueue = Promise.resolve();

function saveResultsAsync(results, filename, fields) {
  saveQueue = saveQueue.then(() => {
    if (results.length === 0) return;
    const parser = new Parser({ fields });
    const csv = parser.parse(results);
    fs.writeFileSync(filename, csv);
  });
  return saveQueue;
}

function saveResults(results, filename) {
  const fields = [
    'Account ID', 'Country', 'City', 'Company Name', 'Address',
    'Phone', 'Website', 'Email', 'Password', 'Individual Page'
  ];
  return saveResultsAsync(results, filename, fields);
}

function saveErrorResults(results, filename) {
  const fields = [
    'Country', 'City', 'Company Name', 'Address',
    'Phone', 'Website', 'Email', 'Error'
  ];
  return saveResultsAsync(results, filename, fields);
}

// Worker function for each tab
async function tabWorker(browser, workQueue, results, tabId) {
  const page = await browser.newPage();
  
  try {
    await ensureLoggedIn(page);
    
    while (workQueue.length > 0) {
      const task = workQueue.shift();
      if (!task) break;
      
      const { record, accountId } = task;
      
      try {
        const result = await createAccount(page, record, accountId, tabId);
        
        if (result.success) {
          results.success.push(result.data);
          await saveResults(results.success, OUTPUT_FILE_COMPLETE);
          results.successCount++;
        } else {
          const errorData = { ...result.data };
          delete errorData['Account ID'];
          results.errors.push(errorData);
          await saveErrorResults(results.errors, OUTPUT_FILE_ERRORS);
          results.errorCount++;
        }
      } catch (error) {
        console.error(`[Tab ${tabId}] ❌ Exception: ${error.message}`);
        results.errors.push({
          'Country': record.Country,
          'City': record.City,
          'Company Name': record['Company Name'],
          'Address': record.Address,
          'Phone': record.Phone,
          'Website': record.Website,
          'Email': record.Email || '',
          'Error': `Exception: ${error.message}`
        });
        await saveErrorResults(results.errors, OUTPUT_FILE_ERRORS);
        results.errorCount++;
      }
    }
  } finally {
    await page.close();
  }
}

async function main() {
  const inputCsvPath = process.argv[2] || INPUT_CSV_PATH;
  
  if (!fs.existsSync(inputCsvPath)) {
    console.error(`❌ CSV file not found: ${inputCsvPath}`);
    console.log('Usage: node script.js <path-to-csv>');
    return;
  }
  
  const csvContent = fs.readFileSync(inputCsvPath, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  console.log(`📊 Found ${records.length} companies to process`);
  console.log(`⚡ Using ${MAX_CONCURRENT_TABS} concurrent tabs`);
  
  const browser = await puppeteer.launch(BROWSER_CONFIG);
  
  try {
    const existingSuccess = loadExistingResults(OUTPUT_FILE_COMPLETE);
    const existingErrors = loadExistingResults(OUTPUT_FILE_ERRORS);
    
    console.log(`📂 Loaded ${existingSuccess.length} existing successful accounts`);
    console.log(`📂 Loaded ${existingErrors.length} existing error records`);
    
    const results = {
      success: [...existingSuccess],
      errors: [...existingErrors],
      successCount: 0,
      errorCount: 0
    };
    
    // Create work queue
    const workQueue = records.map((record, index) => ({
      record,
      accountId: STARTING_ACCOUNT_ID + index
    }));
    
    // Launch worker tabs
    const startTime = Date.now();
    const workers = [];
    
    for (let i = 1; i <= MAX_CONCURRENT_TABS; i++) {
      workers.push(tabWorker(browser, workQueue, results, i));
    }
    
    await Promise.all(workers);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n=== Summary ===');
    console.log(`⏱️  Total time: ${duration}s`);
    console.log(`✅ Total successful: ${results.success.length}`);
    console.log(`   - Newly created: ${results.successCount}`);
    console.log(`❌ Total failed: ${results.errors.length}`);
    console.log(`   - New failures: ${results.errorCount}`);
    console.log(`⚡ Average speed: ${(results.successCount / (duration / 60)).toFixed(2)} accounts/min`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
    console.log('\n=== Process completed ===');
  }
}

main().catch(console.error);