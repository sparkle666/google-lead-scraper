import puppeteer from 'puppeteer';
import fs from 'fs';
import { Parser } from '@json2csv/plainjs';

// Define sectors and countries based on the HTML
const sectors = [
  { value: '4', name: 'Air Freight' },
  { value: '5', name: 'Airport Authority' },
  { value: '10', name: 'Cargo Insurance' },
  { value: '22', name: 'Couriers, Mail & Express' },
  { value: '23', name: 'Customs Broker' },
  { value: '17', name: 'Equipment Supplier' },
  { value: '27', name: 'Events & Exhibition Forwarders' },
  { value: '20', name: 'Export Association' },
  { value: '19', name: 'Exporter' },
  { value: '24', name: 'Finance & Factoring' },
  { value: '11', name: 'Freight Associations' },
  { value: '15', name: 'Freight Exchange' },
  { value: '30', name: 'Freight Forwarder' },
  { value: '31', name: 'Freight Network' },
  { value: '9', name: 'Freight Software' },
  { value: '28', name: 'General Service Agent (GSA)' },
  { value: '25', name: 'Hauliers / Trucking' },
  { value: '18', name: 'Importer' },
  { value: '14', name: 'Legal & Consultant' },
  { value: '13', name: 'Publication' },
  { value: '26', name: 'Rail Operators & Agents' },
  { value: '12', name: 'Recruitment' },
  { value: '6', name: 'Removals' },
  { value: '2', name: 'Sea Port Authority and Operators' },
  { value: '16', name: 'Ship Chandler' },
  { value: '1', name: 'Shipping Line' },
  { value: '7', name: 'Track & Trace' },
  { value: '29', name: 'Training & Education' },
  { value: '8', name: 'Warehousing & Packing' }
];

const countries = [
  // Top Tier - Major Global Freight Hubs
//   { value: 'CN', name: 'China' },
//   { value: 'US', name: 'U.S.A.' },
//   { value: 'DE', name: 'Germany' },
//   { value: 'GB', name: 'United Kingdom' },
//   { value: 'JP', name: 'Japan' },
//   { value: 'NL', name: 'Netherlands' },
//   { value: 'SG', name: 'Singapore' },
//   { value: 'KR', name: 'Korea, South' },
//   { value: 'HK', name: 'Hong Kong SAR' },
//   { value: 'FR', name: 'France' },
//   { value: 'IT', name: 'Italy' },
//   { value: 'ES', name: 'Spain' },
//   { value: 'CA', name: 'Canada' },
//   { value: 'AU', name: 'Australia' },
//   { value: 'BE', name: 'Belgium' },
//   { value: 'AE', name: 'U.A.E' },
//   { value: 'CH', name: 'Switzerland' },
//   { value: 'IN', name: 'India' },
//   { value: 'BR', name: 'Brazil' },
//   { value: 'MX', name: 'Mexico' },
  
//   // Second Tier - Regional Hubs
//   { value: 'MY', name: 'Malaysia' },
//   { value: 'TH', name: 'Thailand' },
//   { value: 'ID', name: 'Indonesia' },
//   { value: 'TW', name: 'Taiwan' },
//   { value: 'TR', name: 'Turkey' },
//   { value: 'ZA', name: 'South Africa' },
//   { value: 'PL', name: 'Poland' },
//   { value: 'SE', name: 'Sweden' },
//   { value: 'NO', name: 'Norway' },
//   { value: 'DK', name: 'Denmark' },
//   { value: 'AT', name: 'Austria' },
//   { value: 'IE', name: 'Ireland' },
//   { value: 'FI', name: 'Finland' },
//   { value: 'PT', name: 'Portugal' },
//   { value: 'GR', name: 'Greece' },
//   { value: 'CZ', name: 'Czech Rep' },
//   { value: 'RU', name: 'Russia' },
//   { value: 'SA', name: 'Saudi Arabia' },
//   { value: 'QA', name: 'Qatar' },
//   { value: 'IL', name: 'Israel' },
//   { value: 'NZ', name: 'New Zealand' },
//   { value: 'CL', name: 'Chile' },
//   { value: 'AR', name: 'Argentina' },
//   { value: 'CO', name: 'Colombia' },
//   { value: 'PE', name: 'Peru' },
//   { value: 'VN', name: 'Vietnam' },
//   { value: 'PH', name: 'Philippines' },
//   { value: 'PK', name: 'Pakistan' },
//   { value: 'EG', name: 'Egypt' },
//   { value: 'NG', name: 'Nigeria' },
//   { value: 'KE', name: 'Kenya' },
//   { value: 'MA', name: 'Morocco' },
  
  // Rest of Countries - Alphabetical
//   { value: 'AG', name: 'Antigua and Barbuda' },
//   { value: 'AM', name: 'Armenia' },
//   { value: 'AW', name: 'Aruba' },
//   { value: 'AZ', name: 'Azerbaijan' },
//   { value: 'BS', name: 'Bahamas' },
//   { value: 'BH', name: 'Bahrain' },
//   { value: 'BD', name: 'Bangladesh' },
//   { value: 'BB', name: 'Barbados' },
//   { value: 'BY', name: 'Belarus' },
//   { value: 'BZ', name: 'Belize' },
//   { value: 'BJ', name: 'Benin' },
//   { value: 'BM', name: 'Bermuda' },
//   { value: 'BT', name: 'Bhutan' },
//   { value: 'BO', name: 'Bolivia' },
//   { value: 'BA', name: 'Bosnia' },
//   { value: 'BW', name: 'Botswana' },
//   { value: 'BN', name: 'Brunei Darussalam' },
//   { value: 'BG', name: 'Bulgaria' },
//   { value: 'BF', name: 'Burkina Faso' },
//   { value: 'BI', name: 'Burundi' },
//   { value: 'KH', name: 'Cambodia' },
//   { value: 'CM', name: 'Cameroon' },
//   { value: 'CV', name: 'Cape Verde' },
//   { value: 'KY', name: 'Cayman Islands' },
//   { value: 'CF', name: 'Central African Republic' },
//   { value: 'TD', name: 'Chad' },
//   { value: 'CX', name: 'Christmas Island' },
//   { value: 'KM', name: 'Comoros' },
//   { value: 'CG', name: 'Congo, Republic of' },
//   { value: 'CD', name: 'Congo, Democratic Republic of' },
//   { value: 'CK', name: 'Cook Islands' },
//   { value: 'CR', name: 'Costa Rica' },
//   { value: 'CI', name: 'Ivory Coast' },
//   { value: 'HR', name: 'Croatia' },
//   { value: 'CU', name: 'Cuba' },
//   { value: 'CY', name: 'Cyprus' },
//   { value: 'DJ', name: 'Djibouti' },
//   { value: 'DM', name: 'Dominica' },
//   { value: 'DO', name: 'Dominican Republic' },
//   { value: 'EC', name: 'Ecuador' },
//   { value: 'SV', name: 'El Salvador' },
//   { value: 'GQ', name: 'Equatorial Guinea' },
//   { value: 'ER', name: 'Eritrea' },
//   { value: 'EE', name: 'Estonia' },
//   { value: 'ET', name: 'Ethiopia' },
//   { value: 'FK', name: 'Falkland Islands' },
//   { value: 'FO', name: 'Faroe Islands' },
//   { value: 'FJ', name: 'Fiji' },
//   { value: 'GF', name: 'French Guiana' },
//   { value: 'PF', name: 'French Polynesia' },
//   { value: 'GA', name: 'Gabon' },
//   { value: 'GM', name: 'Gambia' },
//   { value: 'GE', name: 'Georgia' },
//   { value: 'GH', name: 'Ghana' },
//   { value: 'GI', name: 'Gibraltar' },
//   { value: 'GL', name: 'Greenland (Denmark)' },
//   { value: 'GD', name: 'Grenada' },
//   { value: 'GP', name: 'Guadeloupe' },
//   { value: 'GU', name: 'Guam' },
//   { value: 'GT', name: 'Guatemala' },
//   { value: 'GN', name: 'Guinea' },
//   { value: 'GW', name: 'Guinea-Bissau' },
//   { value: 'GY', name: 'Guyana' },
//   { value: 'HT', name: 'Haiti' },
//   { value: 'HN', name: 'Honduras' },
//   { value: 'HU', name: 'Hungary' },
//   { value: 'IS', name: 'Iceland' },
//   { value: 'IR', name: 'Iran' },
//   { value: 'IQ', name: 'Iraq' },
//   { value: 'JM', name: 'Jamaica' },
//   { value: 'JO', name: 'Jordan' },
//   { value: 'KZ', name: 'Kazakhstan' },
//   { value: 'KI', name: 'Kiribati' },
//   { value: 'KP', name: 'Korea, North' },
//   { value: 'KW', name: 'Kuwait' },
//   { value: 'KG', name: 'Kyrgyzstan' },
//   { value: 'LA', name: 'Laos' },
//   { value: 'LV', name: 'Latvia' },
//   { value: 'LB', name: 'Lebanon' },
//   { value: 'LS', name: 'Lesotho' },
//   { value: 'LR', name: 'Liberia' },
//   { value: 'LY', name: 'Libya' },
//   { value: 'LI', name: 'Liechtenstein' },
//   { value: 'LT', name: 'Lithuania' },
//   { value: 'LU', name: 'Luxembourg' },
//   { value: 'MO', name: 'Macau' },
//   { value: 'MK', name: 'North Macedonia' },
//   { value: 'MG', name: 'Madagascar' },
//   { value: 'MW', name: 'Malawi' },
//   { value: 'MV', name: 'Maldives' },
//   { value: 'ML', name: 'Mali' },
//   { value: 'MT', name: 'Malta' },
//   { value: 'MH', name: 'Marshall Islands' },
//   { value: 'MQ', name: 'Martinique' },
//   { value: 'MR', name: 'Mauritania' },
//   { value: 'MU', name: 'Mauritius' },
//   { value: 'YT', name: 'Mayotte' },
//   { value: 'MD', name: 'Moldova' },
//   { value: 'MC', name: 'Monaco' },
//   { value: 'MN', name: 'Mongolia' },
//   { value: 'ME', name: 'Montenegro' },
//   { value: 'MS', name: 'Montserrat' },
//   { value: 'MZ', name: 'Mozambique' },
//   { value: 'MM', name: 'Myanmar (Burma)' },
//   { value: 'NA', name: 'Namibia' },
//   { value: 'NR', name: 'Nauru' },
//   { value: 'NP', name: 'Nepal' },
//   { value: 'AN', name: 'Netherlands Antilles' },
//   { value: 'NC', name: 'New Caledonia' },
//   { value: 'NI', name: 'Nicaragua' },
//   { value: 'NE', name: 'Niger' },
//   { value: 'NF', name: 'Norfolk Island' },
//   { value: 'MP', name: 'Northern Mariana Islands' },
//   { value: 'OM', name: 'Oman' },
//   { value: 'PS', name: 'Palestine' },
//   { value: 'PA', name: 'Panama' },
//   { value: 'PG', name: 'Papua New Guinea' },
//   { value: 'PY', name: 'Paraguay' },
//   { value: 'PR', name: 'Puerto Rico' },
//   { value: 'RO', name: 'Romania' },
//   { value: 'RW', name: 'Rwanda' },
//   { value: 'KN', name: 'St. Kitts and Nevis' },
//   { value: 'LC', name: 'Saint Lucia' },
//   { value: 'VC', name: 'St. Vincent and the Grenadines' },
//   { value: 'WS', name: 'Samoa' },
//   { value: 'ST', name: 'Sao Tome & Principe' },
  // { value: 'SN', name: 'Senegal' },
  // { value: 'RS', name: 'Serbia' },
  // { value: 'SC', name: 'Seychelles' },
  // { value: 'SL', name: 'Sierra Leone' },
  // { value: 'SK', name: 'Slovakia' },
  // { value: 'SI', name: 'Slovenia' },
  // { value: 'SO', name: 'Somalia' },
  // { value: 'SS', name: 'South Sudan' },
  // { value: 'LK', name: 'Sri Lanka' },
  // { value: 'SD', name: 'Sudan' },
  // { value: 'SR', name: 'Surinam' },
  // { value: 'SZ', name: 'Swaziland' },
  // { value: 'SY', name: 'Syria' },
  // { value: 'TJ', name: 'Tadjikistan' },
  // { value: 'TZ', name: 'Tanzania' },
  // { value: 'TL', name: 'Timor Loro Sae' },
  // { value: 'TG', name: 'Togo' },
  // { value: 'TO', name: 'Tonga' },
  // { value: 'TT', name: 'Trinidad and Tobago' },
  // { value: 'TN', name: 'Tunisia' },
  // { value: 'TM', name: 'Turkmenistan' },
  // { value: 'TC', name: 'Turks and Caicos Islands' },
  // { value: 'UG', name: 'Uganda' },
  // { value: 'UA', name: 'Ukraine' },
  // { value: 'UY', name: 'Uruguay' },
  // { value: 'UZ', name: 'Uzbekistan' },
  // { value: 'VU', name: 'Vanuatu' },
  // { value: 'VE', name: 'Venezuela' },
  // { value: 'VG', name: 'Virgin Islands' },
  // { value: 'YE', name: 'Yemen' },
  // { value: 'ZM', name: 'Zambia' },
  // { value: 'ZW', name: 'Zimbabwe' }

  // { value: 'LA', name: 'Laos' },
  // { value: 'LV', name: 'Latvia' },
  // { value: 'LB', name: 'Lebanon' },
  // { value: 'LS', name: 'Lesotho' },
  // { value: 'LR', name: 'Liberia' },
  // { value: 'LY', name: 'Libya' },
  // { value: 'LI', name: 'Liechtenstein' },
  // { value: 'LT', name: 'Lithuania' },
  // { value: 'LU', name: 'Luxembourg' },
  // { value: 'MO', name: 'Macau' },
  // { value: 'MK', name: 'North Macedonia' },
  // { value: 'MG', name: 'Madagascar' },
  // { value: 'MW', name: 'Malawi' },
  // { value: 'MV', name: 'Maldives' },
  // { value: 'ML', name: 'Mali' },
  // { value: 'MT', name: 'Malta' },
  // { value: 'MH', name: 'Marshall Islands' },
  // { value: 'MQ', name: 'Martinique' },
  { value: 'MR', name: 'Mauritania' },
  { value: 'MU', name: 'Mauritius' },
  { value: 'YT', name: 'Mayotte' },
  { value: 'MD', name: 'Moldova' },
  { value: 'MC', name: 'Monaco' },
  { value: 'MN', name: 'Mongolia' },
  { value: 'ME', name: 'Montenegro' },
  { value: 'MS', name: 'Montserrat' },
  { value: 'MZ', name: 'Mozambique' },
  { value: 'MM', name: 'Myanmar (Burma)' },
  { value: 'NA', name: 'Namibia' },
  // { value: 'NR', name: 'Nauru' },
  // { value: 'NP', name: 'Nepal' },
  // { value: 'AN', name: 'Netherlands Antilles' },
  // { value: 'NC', name: 'New Caledonia' },
  // { value: 'NI', name: 'Nicaragua' },
  // { value: 'NE', name: 'Niger' },
  // { value: 'NF', name: 'Norfolk Island' },
  // { value: 'MP', name: 'Northern Mariana Islands' },
];

async function scrapeCompanies(page) {
  return await page.evaluate(() => {
    const companies = [];
    const cards = document.querySelectorAll('.card.mb-3.shadow-sm');

    cards.forEach(card => {
      const company = {};

      // Name
      const nameEl = card.querySelector('[itemprop="name"]');
      company.name = nameEl ? nameEl.textContent.trim() : '';

      // Address components
      const streetEl = card.querySelector('[itemprop="streetAddress"]');
      const localityEl = card.querySelector('[itemprop="addressLocality"]');
      const regionEl = card.querySelector('[itemprop="addressRegion"]');
      const postalEl = card.querySelector('[itemprop="postalCode"]');
      
      const street = streetEl ? streetEl.textContent.trim() : '';
      const locality = localityEl ? localityEl.textContent.trim() : '';
      const region = regionEl ? regionEl.textContent.trim() : '';
      const postal = postalEl ? postalEl.textContent.trim() : '';
      
      company.address = `${street}, ${locality}, ${region}, ${postal}`.replace(/,\s*,/g, ',').trim();

      // Phone
      const phoneEl = card.querySelector('[itemprop="telephone"]');
      company.phone = phoneEl ? phoneEl.textContent.trim() : '';

      // Website
      const websiteEl = card.querySelector('a[href*="http"][target="_blank"]');
      company.website = websiteEl ? websiteEl.href : '';

      // Profile URL
      const profileEl = card.querySelector('a[href*="/profile/"]');
      company.profileUrl = profileEl ? 'https://www.freightnet.com' + profileEl.getAttribute('href') : '';

      // Premium Member Badge
      const premiumBadge = card.querySelector('.badge.bg-success');
      company.isPremiumMember = premiumBadge ? 'Yes' : 'No';

      companies.push(company);
    });

    return companies;
  });
}

async function scrapeAllPages(page, countryCode, sectorValue, sectorName, countryName, outputDir) {
  const allCompanies = [];
  let currentPage = 1;
  let hasNextPage = true;
  const saveInterval = 10; // Save every 10 pages

  // Create temporary filename for incremental saves
  const baseFilename = `${countryName.replace(/[^a-z0-9]/gi, '_')}_${sectorName.replace(/[^a-z0-9]/gi, '_')}`;
  const finalFilename = `${outputDir}/${baseFilename}.csv`;
  const tempFilename = `${outputDir}/${baseFilename}_temp.csv`;

  while (hasNextPage) {
    console.log(`Scraping page ${currentPage} for sector: ${sectorName}, country: ${countryCode}`);

    const url = `https://www.freightnet.com/directory/p${currentPage}/c${countryCode}/s${sectorValue}.htm`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for content to load
    await page.waitForSelector('.card.mb-3.shadow-sm', { timeout: 10000 }).catch(() => {
      console.log('No companies found on this page');
    });

    // Scrape companies on current page
    const companies = await scrapeCompanies(page);
    allCompanies.push(...companies);

    console.log(`Found ${companies.length} companies on page ${currentPage} (Total so far: ${allCompanies.length})`);

    // Save incrementally every N pages
    if (currentPage % saveInterval === 0) {
      console.log(`💾 Saving checkpoint at page ${currentPage}...`);
      saveToCSV(allCompanies, tempFilename);
    }

    // Check if there's a next page
    hasNextPage = await page.evaluate(() => {
      const nextButton = Array.from(document.querySelectorAll('.pagination a')).find(a => a.textContent.includes('Next'));
      return nextButton && !nextButton.parentElement.classList.contains('disabled');
    });

    if (hasNextPage) {
      currentPage++;
      // Add delay to be respectful to the server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final save and cleanup
  if (allCompanies.length > 0) {
    saveToCSV(allCompanies, finalFilename);
    
    // Remove temp file if it exists
    if (fs.existsSync(tempFilename)) {
      fs.unlinkSync(tempFilename);
    }
  }

  return allCompanies;
}

function saveToCSV(companies, filename) {
  if (companies.length === 0) {
    console.log(`No companies to save for ${filename}`);
    return;
  }

  const fields = ['name', 'address', 'phone', 'website', 'profileUrl', 'isPremiumMember'];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(companies);

  fs.writeFileSync(filename, csv);
  console.log(`Saved ${companies.length} companies to ${filename}`);
}

// Save checkpoint to track progress
function saveCheckpoint(country, sector, outputDir) {
  const checkpoint = {
    lastCountry: country.value,
    lastSector: sector.value,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(`${outputDir}/checkpoint.json`, JSON.stringify(checkpoint, null, 2));
}

// Load checkpoint to resume from last position
function loadCheckpoint(outputDir) {
  const checkpointFile = `${outputDir}/checkpoint.json`;
  if (fs.existsSync(checkpointFile)) {
    const data = fs.readFileSync(checkpointFile, 'utf8');
    return JSON.parse(data);
  }
  return null;
}

// Check if we should skip this country/sector combination
function shouldSkip(country, sector, checkpoint) {
  if (!checkpoint) return false;
  
  const countryIndex = countries.findIndex(c => c.value === country.value);
  const checkpointCountryIndex = countries.findIndex(c => c.value === checkpoint.lastCountry);
  
  if (countryIndex < checkpointCountryIndex) return true;
  if (countryIndex > checkpointCountryIndex) return false;
  
  // Same country, check sector
  const sectorIndex = sectors.findIndex(s => s.value === sector.value);
  const checkpointSectorIndex = sectors.findIndex(s => s.value === checkpoint.lastSector);
  
  return sectorIndex <= checkpointSectorIndex;
}

async function main() {
  const browser = await puppeteer.launch({ 
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
  
  });
  
  const page = await browser.newPage();

  // Create output directory if it doesn't exist
  const outputDir = './freightnet_data';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Load checkpoint to resume from last position
  const checkpoint = loadCheckpoint(outputDir);
  if (checkpoint) {
    console.log(`\n📌 Resuming from checkpoint: Country ${checkpoint.lastCountry}, Sector ${checkpoint.lastSector}`);
  }

  try {
    // Loop through each country
    for (const country of countries) {
      console.log(`\n=== Processing country: ${country.name} ===`);

      // Loop through each sector for this country
      for (const sector of sectors) {
        // Skip if already processed based on checkpoint
        if (shouldSkip(country, sector, checkpoint)) {
          console.log(`⏭️  Skipping ${country.name} - ${sector.name} (already processed)`);
          continue;
        }

        try {
          console.log(`\nProcessing sector: ${sector.name}`);
          
          const companies = await scrapeAllPages(page, country.value, sector.value, sector.name, country.name, outputDir);
          
          if (companies.length > 0) {
            console.log(`✅ Successfully scraped ${companies.length} companies for ${country.name} - ${sector.name}`);
          }

          // Save checkpoint after each successful sector scrape
          saveCheckpoint(country, sector, outputDir);

          // Delay between sectors
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`❌ Error processing ${country.name} - ${sector.name}:`, error.message);
          // Save checkpoint even on error so we can resume
          saveCheckpoint(country, sector, outputDir);
          continue;
        }
      }
    }

    // Delete checkpoint file when fully completed
    const checkpointFile = `${outputDir}/checkpoint.json`;
    if (fs.existsSync(checkpointFile)) {
      fs.unlinkSync(checkpointFile);
      console.log('\n✅ Scraping fully completed! Checkpoint file removed.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await browser.close();
    console.log('\n=== Browser closed ===');
  }
}

main().catch(console.error);


// Already scraped countries to skip
//   { value: 'AF', name: 'Afghanistan' },
//   { value: 'AL', name: 'Albania' },
//   { value: 'DZ', name: 'Algeria' },
//   { value: 'AS', name: 'American Samoa' },
//   { value: 'AD', name: 'Andorra' },
//   { value: 'AO', name: 'Angola' },
//   { value: 'AI', name: 'Anguilla' },