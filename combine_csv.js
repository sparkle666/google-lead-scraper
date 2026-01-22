import fs from 'fs';
import path from 'path';
import { Parser } from '@json2csv/plainjs';
import { parse } from 'csv-parse/sync';
import AdmZip from 'adm-zip';

// Function to extract country and sector from filename
// Expected format: CountryName_SectorName.csv
function extractMetadataFromFilename(filename) {
  // Remove .csv extension
  const nameWithoutExt = filename.replace('.csv', '');
  
  // Split by underscore - first part is country, rest is sector
  const parts = nameWithoutExt.split('_');
  
  if (parts.length < 2) {
    console.warn(`⚠️  Warning: Could not parse filename: ${filename}`);
    return { country: 'Unknown', sector: 'Unknown' };
  }
  
  // First part is country
  const country = parts[0].replace(/_/g, ' ');
  
  // Rest is sector (join back in case sector name has underscores)
  const sector = parts.slice(1).join(' ').replace(/_/g, ' ');
  
  return { country, sector };
}

async function combineCSVFiles(zipFilePath, outputFilePath = './combined_freightnet_data.csv') {
  console.log('📦 Reading zip file...');
  
  // Read the zip file
  const zip = new AdmZip(zipFilePath);
  const zipEntries = zip.getEntries();
  
  const allData = [];
  let filesProcessed = 0;
  let totalRecords = 0;
  
  console.log(`📁 Found ${zipEntries.length} files in zip\n`);
  
  // Process each CSV file in the zip
  for (const entry of zipEntries) {
    // Skip directories and non-CSV files
    if (entry.isDirectory || !entry.entryName.endsWith('.csv')) {
      continue;
    }
    
    // Skip temp files
    if (entry.entryName.includes('_temp.csv')) {
      console.log(`⏭️  Skipping temp file: ${entry.entryName}`);
      continue;
    }
    
    try {
      // Get filename without path
      const filename = path.basename(entry.entryName);
      
      // Extract country and sector from filename
      const { country, sector } = extractMetadataFromFilename(filename);
      
      // Read CSV content from zip
      const csvContent = entry.getData().toString('utf8');
      
      // Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      // Add country and sector to each record
      const enrichedRecords = records.map(record => ({
        country,
        sector,
        ...record
      }));
      
      allData.push(...enrichedRecords);
      filesProcessed++;
      totalRecords += enrichedRecords.length;
      
      console.log(`✅ Processed: ${filename}`);
      console.log(`   Country: ${country} | Sector: ${sector} | Records: ${enrichedRecords.length}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${entry.entryName}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Total records: ${totalRecords}`);
  console.log('='.repeat(60) + '\n');
  
  if (allData.length === 0) {
    console.log('⚠️  No data to save!');
    return;
  }
  
  // Define field order for output CSV
  const fields = ['country', 'sector', 'name', 'address', 'phone', 'website', 'profileUrl', 'isPremiumMember'];
  
  // Convert to CSV
  console.log('💾 Generating combined CSV file...');
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(allData);
  
  // Write to file
  fs.writeFileSync(outputFilePath, csv);
  
  console.log(`\n✅ SUCCESS! Combined CSV saved to: ${outputFilePath}`);
  console.log(`   Total records: ${totalRecords.toLocaleString()}`);
  
  // Generate statistics
  generateStatistics(allData);
}

function generateStatistics(data) {
  console.log('\n' + '='.repeat(60));
  console.log('📈 Statistics:');
  console.log('='.repeat(60));
  
  // Count by country
  const byCountry = {};
  data.forEach(record => {
    byCountry[record.country] = (byCountry[record.country] || 0) + 1;
  });
  
  console.log('\n🌍 Records by Country:');
  Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .forEach(([country, count]) => {
      console.log(`   ${country}: ${count.toLocaleString()}`);
    });
  
  // Count by sector
  const bySector = {};
  data.forEach(record => {
    bySector[record.sector] = (bySector[record.sector] || 0) + 1;
  });
  
  console.log('\n🏢 Records by Sector (Top 10):');
  Object.entries(bySector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([sector, count]) => {
      console.log(`   ${sector}: ${count.toLocaleString()}`);
    });
  
  // Premium members count
  const premiumCount = data.filter(record => record.isPremiumMember === 'Yes').length;
  const premiumPercentage = ((premiumCount / data.length) * 100).toFixed(2);
  
  console.log(`\n⭐ Premium Members: ${premiumCount.toLocaleString()} (${premiumPercentage}%)`);
  
  // Records with website
  const withWebsite = data.filter(record => record.website && record.website.trim() !== '').length;
  const websitePercentage = ((withWebsite / data.length) * 100).toFixed(2);
  
  console.log(`🌐 With Website: ${withWebsite.toLocaleString()} (${websitePercentage}%)`);
  
  console.log('='.repeat(60) + '\n');
}

// Main execution
const zipFilePath = process.argv[2] || './Freightnet_All_Data.zip';
const outputFilePath = process.argv[3] || './combined_freightnet_data.csv';

if (!fs.existsSync(zipFilePath)) {
  console.error(`❌ Error: Zip file not found at: ${zipFilePath}`);
  console.log('\nUsage: node combine_csv.js <path-to-zip-file> [output-file.csv]');
  console.log('Example: node combine_csv.js ./freightnet_data.zip ./combined_data.csv');
  process.exit(1);
}

combineCSVFiles(zipFilePath, outputFilePath).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});