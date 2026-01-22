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
const INPUT_CSV_PATH = './companies.csv';

// Account Settings
const STARTING_ACCOUNT_ID = 641;

// Password Generation
const PASSWORD_LENGTH = 12;
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

// Timeouts & Delays (in milliseconds)
const DELAYS = {
  shortDelay: 1000,
  mediumDelay: 2000,
  longDelay: 5000
};

// Browser Settings
const BROWSER_CONFIG = {
  headless: false,
  defaultViewport: { width: 1280, height: 800 }
};

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
  // Add more mappings as needed
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
  console.log('Cookies saved to', filepath);
}

// Load cookies from file
async function loadCookies(page, filepath) {
  if (fs.existsSync(filepath)) {
    const cookies = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    await page.setCookie(...cookies);
    console.log('Cookies loaded from', filepath);
    return true;
  }
  return false;
}

// Login to the website
async function login(page) {
  // Try to load existing cookies
  const cookiesLoaded = await loadCookies(page, COOKIES_FILE);
  
  if (cookiesLoaded) {
    // Navigate to admin panel to check if cookies are valid
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle2' });
    
    // Check if we're logged in
    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('input[name="username"]');
    });
    
    if (isLoggedIn) {
      console.log('✅ Logged in using saved cookies');
      return;
    }
  }
  
  // Need to login
  console.log('Logging in...');
  await page.goto(ADMIN_URL, { waitUntil: 'networkidle2' });
  
  // Fill login form
  await page.type(SELECTORS.usernameInput, LOGIN_CREDENTIALS.username);
  await page.type(SELECTORS.passwordField, LOGIN_CREDENTIALS.password);
  
  // Submit login
  await page.click(SELECTORS.loginButton);
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  // Save cookies
  await saveCookies(page, COOKIES_FILE);
  console.log('✅ Logged in successfully');
}

// Check for form errors
async function checkForErrors(page) {
  const errorInfo = await page.evaluate((selector) => {
    const errorDiv = document.querySelector(selector);
    if (!errorDiv) return null;
    
    const isVisible = window.getComputedStyle(errorDiv).display !== 'none';
    
    if (!isVisible) return null;
    
    // Extract error messages
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

// Create account
async function createAccount(page, data, accountId) {
  console.log(`\n--- Creating account for: ${data['Company Name']} ---`);
  
  // Navigate to add account page
  await page.goto(ADD_ACCOUNT_URL, 
    { waitUntil: 'networkidle2' });
  
  // Wait for form to load
  await page.waitForSelector(SELECTORS.typeSelector);
  
  // Select account type: Logistics Professional
  await page.select(SELECTORS.typeSelector, ACCOUNT_TYPE_LOGISTICS);
  
  // Wait for individual page field to appear
  await page.waitForSelector(SELECTORS.locationInput, { visible: true });
  await new Promise(resolve => setTimeout(resolve, DELAYS.shortDelay));
  
  // Generate data
  const individualPage = generatePageName(data['Company Name']);
  const email = getEmail(data);
  const password = generatePassword();
  
  // Fill individual page
  await page.type(SELECTORS.locationInput, individualPage);
  
  // Fill email
  await page.type(SELECTORS.emailInput, email);
  
  // Fill password
  await page.type(SELECTORS.passwordInput, password);
  await page.type(SELECTORS.passwordRepeatInput, password);
  
  // Click Next button
  await page.click(SELECTORS.next1Button);
  
  // Wait for second form to load
  await page.waitForSelector(SELECTORS.companyNameInput, { visible: true });
  await new Promise(resolve => setTimeout(resolve, DELAYS.mediumDelay));
  
  // Fill company details
  await page.type(SELECTORS.companyNameInput, data['Company Name']);
  await page.type(SELECTORS.firstNameInput, data['Company Name']);
  await page.type(SELECTORS.lastNameInput, data['Company Name']);
  
  // Select country
  const countryValue = mapCountry(data.Country);
  await page.select(SELECTORS.countrySelect, countryValue);
  
  // Wait for state/region to populate
  await new Promise(resolve => setTimeout(resolve, DELAYS.shortDelay));
  
  // Try to select state/region if available
  try {
    const stateSelect = await page.$(SELECTORS.stateSelect);
    const isDisabled = await page.evaluate(el => el.disabled, stateSelect);
    
    if (!isDisabled) {
      // Get first available option (skip "- Select -")
      const firstOption = await page.evaluate(() => {
        const select = document.querySelector('select[name="f[country_level1]"]');
        const options = Array.from(select.options);
        return options.length > 1 ? options[1].value : options[0].value;
      });
      
      if (firstOption !== '0') {
        await page.select(SELECTORS.stateSelect, firstOption);
      }
    }
  } catch (error) {
    console.log('State/Region field not available or disabled');
  }
  
  // Fill address
  if (data.Address) {
    await page.type(SELECTORS.addressInput, data.Address);
  }
  
  // Fill phone - correct way for intl-tel-input
  if (data.Phone) {
    await page.waitForSelector(SELECTORS.phoneInput, { visible: true });

    await page.evaluate((phone) => {
      const input = document.querySelector('input.phone-field.iti__tel-input');
      if (!input) return;

      // Focus without opening dropdown
      input.focus();

      // Set value directly
      input.value = phone;

      // Trigger all required events
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
    }, data.Phone);

    await new Promise(resolve => setTimeout(resolve, DELAYS.mediumDelay));

    const phoneValue = await page.evaluate(() =>
      document.querySelector('input.phone-field.iti__tel-input')?.value
    );

    console.log(`Phone entered: ${phoneValue}`);
  }
  
  // Fill website if exists
  if (data.Website) {
    await page.type(SELECTORS.websiteInput, data.Website);
  }
  
  // Submit form
  await page.click(SELECTORS.submitButton);
  
  // Wait for response
  await new Promise(resolve => setTimeout(resolve, DELAYS.mediumDelay + 1000));
  
  // Check for errors
  const errorInfo = await checkForErrors(page);
  
  if (errorInfo && errorInfo.hasError) {
    console.log(`❌ Error creating account: ${errorInfo.messages.join(', ')} | company: ${data['Company Name']}`);
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
  
  console.log(`✅ Account created: ${email} / company page: ${BASE_URL}/${individualPage}/`);
  
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
function loadExistingResults(filename, fields) {
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
    console.log(`⚠️  Could not load existing data from ${filename}, starting fresh`);
    return [];
  }
}

// Save results to CSV (appends to existing data)
function saveResults(results, filename) {
  if (results.length === 0) return;
  
  const fields = [
    'Account ID',
    'Country',
    'City', 
    'Company Name',
    'Address',
    'Phone',
    'Website',
    'Email',
    'Password',
    'Individual Page'
  ];
  
  const parser = new Parser({ fields });
  const csv = parser.parse(results);
  fs.writeFileSync(filename, csv);
  console.log(`✅ Results saved to ${filename} (${results.length} total records)`);
}

// Save error results to CSV (appends to existing data)
function saveErrorResults(results, filename) {
  if (results.length === 0) return;
  
  const fields = [
    'Country',
    'City',
    'Company Name',
    'Address',
    'Phone',
    'Website',
    'Email',
    'Error'
  ];
  
  const parser = new Parser({ fields });
  const csv = parser.parse(results);
  fs.writeFileSync(filename, csv);
  console.log(`⚠️  Errors saved to ${filename} (${results.length} total records)`);
}

async function main() {
  // Read input CSV
  const inputCsvPath = process.argv[2] || INPUT_CSV_PATH;
  
  if (!fs.existsSync(inputCsvPath)) {
    console.error(`Error: CSV file not found: ${inputCsvPath}`);
    console.log('Usage: node script.js <path-to-csv>');
    return;
  }
  
  const csvContent = fs.readFileSync(inputCsvPath, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  console.log(`Found ${records.length} companies to process`);
  
  // Launch browser
  const browser = await puppeteer.launch(BROWSER_CONFIG);
  
  const page = await browser.newPage();
  
  try {
    // Login
    await login(page);
    
    // Load existing results from CSV files
    const existingSuccess = loadExistingResults(OUTPUT_FILE_COMPLETE, [
      'Account ID', 'Country', 'City', 'Company Name', 'Address', 
      'Phone', 'Website', 'Email', 'Password', 'Individual Page'
    ]);
    
    const existingErrors = loadExistingResults(OUTPUT_FILE_ERRORS, [
      'Country', 'City', 'Company Name', 'Address',
      'Phone', 'Website', 'Email', 'Error'
    ]);
    
    console.log(`📂 Loaded ${existingSuccess.length} existing successful accounts`);
    console.log(`📂 Loaded ${existingErrors.length} existing error records`);
    
    const successResults = [...existingSuccess];
    const errorResults = [...existingErrors];
    
    // Determine starting account ID
    let accountId = STARTING_ACCOUNT_ID;
    
    // if (existingSuccess.length > 0) {
    //   const maxId = Math.max(...existingSuccess.map(r => parseInt(r['Account ID']) || 0));
    //   // Use whichever is higher: STARTING_ACCOUNT_ID or maxId + 1
    //   accountId = Math.max(STARTING_ACCOUNT_ID, maxId + 1);
    //   console.log(`📊 Starting from Account ID: ${accountId} (existing max: ${maxId})`);
    // } else {
    //   console.log(`📊 Starting from Account ID: ${accountId} (fresh start)`);
    // }
    
    // Process each company
    for (const record of records) {
      try {
        const result = await createAccount(page, record, accountId);
        
        if (result.success) {
          successResults.push(result.data);
          // Save successful accounts incrementally
          saveResults(successResults, OUTPUT_FILE_COMPLETE);
          // Only increment ID on success
          accountId++;
        } else {
          // Don't include Account ID in error records
          const errorData = { ...result.data };
          delete errorData['Account ID'];
          errorResults.push(errorData);
          // Save error accounts incrementally
          saveErrorResults(errorResults, OUTPUT_FILE_ERRORS);
        }
        
        // Delay between accounts
        await new Promise(resolve => setTimeout(resolve, DELAYS.mediumDelay));
      } catch (error) {
        console.error(`❌ Exception for ${record['Company Name']}:`, error.message);
        
        // Save exception to errors (no Account ID)
        errorResults.push({
          'Country': record.Country,
          'City': record.City,
          'Company Name': record['Company Name'],
          'Address': record.Address,
          'Phone': record.Phone,
          'Website': record.Website,
          'Email': record.Email || '',
          'Error': `Exception: ${error.message}`
        });
        
        saveErrorResults(errorResults, OUTPUT_FILE_ERRORS);
      }
    }
    
    // Final summary
    console.log('\n=== Summary ===');
    console.log(`✅ Total successful accounts: ${successResults.length}`);
    console.log(`   - Previously existing: ${existingSuccess.length}`);
    console.log(`   - Newly created: ${successResults.length - existingSuccess.length}`);
    console.log(`❌ Total failed records: ${errorResults.length}`);
    console.log(`   - Previously existing: ${existingErrors.length}`);
    console.log(`   - New failures: ${errorResults.length - existingErrors.length}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
    console.log('\n=== Process completed ===');
  }
}

main().catch(console.error);