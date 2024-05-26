import fs from 'fs';
import { format } from 'fast-csv';

export const extractContactInfo = (texts) => {
  console.log("Extracting Contact info...")
  // Regular expression for matching an email
  const emailRegex = /[\w.-]+@[\w.-]+\.[\w.-]+/g;
  
  // Regular expression for matching a phone number in the format +234 followed by 10 digits or Nigerian phone numbers
  const phoneRegex = /\+?234\d{10}\b|\b0[789]0?\d{8}\b/g;

  // Initialize arrays to store extracted emails and phones
  let allEmails = [];
  let allPhones = [];

  // Loop through each text string in the array
  texts.forEach((text) => {
    // Find all email and phone number matches in the current text
    const emails = text.match(emailRegex) || [];
    const phones = text.match(phoneRegex) || [];

    // Add the found emails and phones to the aggregated arrays
    allEmails = [...allEmails, ...emails];
    allPhones = [...allPhones, ...phones];
  });

  // Remove duplicates by converting to a Set and back to an array
  allEmails = [...new Set(allEmails)];
  allPhones = [...new Set(allPhones)];

  // Return the aggregated results
  return {
    emails: allEmails.length > 0 ? allEmails : ["null"],
    phones: allPhones.length > 0 ? allPhones : ["null"]
  };
}


export const writeCSV = (data, append = false) => {
    // Check if we need to append a newline before writing new data
  const fileExists = fs.existsSync('output.csv');

  const ws = fs.createWriteStream('output.csv', { flags: append ? 'a' : 'w' });
 // Write a newline if appending to an existing file
  if (append && fileExists) {
    ws.write('\n');
  }

  const csvStream = format({ headers: !append })
    .on('error', (err) => console.error(err))
    .on('finish', () => console.log('Write to CSV successfully!'));

  csvStream.pipe(ws);

  data.forEach((row) => {
    csvStream.write({
      name: row.name,
      emails: row.emails.join(', '),
      phones: row.phones.join(', '),
      urls: row.urls.join(', ')
    });
  });
  csvStream.end();
};


// Read company names from a text file
export const readNamesFromFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    console.log("Read company_names successfully...")

    const uncleanedData = data.split('\n').map(name => name.trim()).filter(name => name.length > 0);
    // Remove duplicates

    const cleanedData = [...new Set(uncleanedData)]
    console.log(cleanedData)

    return cleanedData;
    
  } catch (err) {
    console.error('Error reading names from file:', err);
    return [];
  }
};

// readNamesFromFile("company_names.txt")

// writeCSV([{
//   emails: [
//     'aircargoseasolution@gmail.com',
//     'info@blesglobalshipping.com.',
//     'Blessedgloballogistics@gmail.com'
//   ],
//   phones: [ '+2348061142499', '08061142499' ],
//   urls: [
//     'https://www.facebook.com/aircargoseasolution/',
//     'https://www.blesglobalshipping.com/',
//     'https://www.businesslist.com.ng/company/190709/blessed-global-shipping-and-logistics-limitd'
//   ],
//   name: 'Blessed Global Shipping and Logistics Nig. Ltd'
// }
// ], true)