import fs from 'fs';
import { format } from 'fast-csv';


// Wrap the writeCSV function in a Promise to make it async
export const writeCSVAsync = (data, append = false) => {
  return new Promise((resolve, reject) => {
    const fileExists = fs.existsSync('ivory_output.csv');

    const ws = fs.createWriteStream('ivory_output.csv', { flags: append ? 'a' : 'w' });

    if (append && fileExists) {
      ws.write('\n');
    }

    const csvStream = format({ headers: !append })
      .on('error', (err) => reject(err))
      .on('finish', () => resolve());

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
  });
};


export const extractContactInfo = (texts) => {
  // Extract email and phone number from an array of text

  console.log("Extracting Contact info...")
  // Regular expression for matching an email
  const emailRegex = /[\w.-]+@[\w.-]+\.[\w.-]+/g;
  
  // Regular expression for matching a phone number in the format +234 followed by 10 digits or Nigerian phone numbers
  // const phoneRegex = /\+?234\d{10}\b|\b0[789]0?\d{8}\b/g; // Nigeria

  // const ukPhoneRegex = /^(?:\+44|0)?(?:\s*\d\s*){10,11}$/;
  // const ukPhoneRegex = /(?:\+44|0)\s*\d{3,4}\s*\d{3,4}\s*\d{3,4}/g;

  // const ukPhoneRegex = /(?:\+44\s?\(0\)\s?|\+44\s?|0)\s?\(?\d{2,4}\)?\s?\d{3,4}\s?\d{3,4}/g;

  // const usaRegex = /(\+1\s?)?(\(\d{3}\)\s?|\d{3}[-.\s]?)\d{3}[-.\s]?\d{4}/g;

  // const franceRegex = /(?:\+33\s?[1-9](?:\s?\d{2}){4}|0[1-9](?:\s?\d{2}){4})\b/g;
  // const germanyRegex = /(?:\+49\s?(?:[1-9]\d{1,4}\s?\d{1,9}|1[5-7]\d\s?\d{7,8})|0(?:[1-9]\d{1,4}\s?\d{1,9}|1[5-7]\d\s?\d{7,8}))\b/g;
  // const aussieRegex = /\b(?:\+61\s?4\d{2}\s?\d{3}\s?\d{3}|\+61\s?[2-7]\s?\d{4}\s?\d{4}|04\d{2}\s?\d{3}\s?\d{3}|\(0[2-7]\)\s?\d{4}\s?\d{4}|0[2-7]\s?\d{4}\s?\d{4})\b/g;

  // const aussieRegex = /(?:\+61\s?\(0\)\s?[2-7]\s?\d{4}\s?\d{4}|\+61\s?4\d{2}\s?\d{3}\s?\d{3}|\+61\s?[2-7]\s?\d{4}\s?\d{4}|04\d{2}\s?\d{3}\s?\d{3}|\(0[2-7]\)\s?\d{4}\s?\d{4}|0[2-7]\s?\d{4}\s?\d{4})\b/g;
  // const belgiumRegex = /(?:\+32\s?4\d{2}\s?\d{2}\s?\d{2}\s?\d{2}|\+32\s?[1-9]\s?\d{3}\s?\d{2}\s?\d{2}|\+32\s?[1-9]{2}\s?\d{2}\s?\d{2}\s?\d{2}|04\d{2}\s?\d{2}\s?\d{2}\s?\d{2}|0[1-9]\s?\d{3}\s?\d{2}\s?\d{2}|0[1-9]{2}\s?\d{2}\s?\d{2}\s?\d{2})\b/g;
  // const netherRegex = /(?:\+31\s?6\s?\d{3}\s?\d{5}|\+31\s?[1-9]\s?\d{3}\s?\d{4}|\+31\s?[1-9]{2}\s?\d{3}\s?\d{4}|06\s?\d{3}\s?\d{5}|0[1-9]\s?\d{3}\s?\d{4}|0[1-9]{2}\s?\d{3}\s?\d{4})\b/g;

  // const ivoryRegex = "/^(\+225)?[-.\s]?\d{3}[-.\s]?\d{2}[-.\s]?\d{2}$/"

  const ivoryRegex = /(?:\+225\s?0?\d\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}|\+225\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}|0?\d\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2})\b/g;



  // // Initialize arrays to store extracted emails and phones
  let allEmails = [];
  let allPhones = [];

  // Loop through each text string in the array
  texts.forEach((text) => {
    // Find all email and phone number matches in the current text
    const emails = text.match(emailRegex) || [];
    const phones = text.match(ivoryRegex) || [];

    // Add the found emails and phones to the aggregated arrays
    allEmails = [...allEmails, ...emails];
    allPhones = [...allPhones, ...phones];
  });

  // Remove duplicates by converting to a Set and back to an array
  allEmails = [...new Set(allEmails)]
  allPhones = [...new Set(allPhones)]

  // console.log(allEmails, allPhones)

  // Return the aggregated results
  return {
    emails: allEmails.length > 0 ? allEmails : ["null"],
    phones: allPhones.length > 0 ? allPhones : ["null"]
  };
}
// const phoneNumbers = ['+225 01 23 45 67 89, +225 2127 1720 or  at my mobile 01 23 45 67 89. another@gmaifdfl.com another@gmail.com ddkfd jesu@gmail.co.uk']

// extractContactInfo(phoneNumbers)

export const writeCSV = (data, append = false) => {
    // Check if we need to append a newline before writing new data
  const fileExists = fs.existsSync('germany_output.csv');

  const ws = fs.createWriteStream('germany_output.csv', { flags: append ? 'a' : 'w' });
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
  // Wait for 4 seconds
  console.log("Waiting for 4 seconds...")
  setTimeout(()=> console.log("Waited for 4 seconds..."), 4000)

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
