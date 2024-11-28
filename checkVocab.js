// checkVocab.js
import fs from 'fs/promises';
import path from 'path';

// Function to remove duplicates from the CSV file
async function removeDuplicatesFromCSVFile(filePath) {
    try {
        // Read the file content as text
        const csvString = await fs.readFile(filePath, 'utf8');
    
        // Split the input CSV string into rows
        const rows = csvString.trim().split('\n');
    
        // Get the headers from the first row
        const headers = rows[0].split(',');
    
        // Create a set to track unique English words and Russian translations
        const uniqueWordsSet = new Set();
    
        // Create an array to store unique rows
        const uniqueRows = [rows[0]]; // Keep the headers
    
        // Loop through each row starting from the second one (skip headers)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].split(',');
    
            const englishWord = row[0].trim();
            const russianTranslation = row[2].trim();
    
            // Create a unique key combining the English word and Russian translation
            const uniqueKey = englishWord + '|' + russianTranslation;
    
            // Check if the word pair is already in the set
            if (!uniqueWordsSet.has(uniqueKey)) {
                // Add to the set and uniqueRows if it's not already present
                uniqueWordsSet.add(uniqueKey);
                uniqueRows.push(rows[i]);
            }
        }
    
        // Join the unique rows back into a CSV string
        const uniqueCSVContent = uniqueRows.join('\n');
        
        // Define the new file path (e.g., appending "_unique" to the original file name)
        const newFilePath = path.join(path.dirname(filePath), `${path.basename(filePath, '.csv')}_unique.csv`);
        
        // Write the unique CSV content into the new file
        await fs.writeFile(newFilePath, uniqueCSVContent, 'utf8');
        
        console.log(`Unique CSV saved to: ${newFilePath}`);
        
    } catch (error) {
        console.error('Error reading or processing file:', error);
        throw error;
    }
}

// Immediately Invoked Async Function to automatically start processing
(async () => {
    try {
        await removeDuplicatesFromCSVFile('words.csv');
    } catch (error) {
        console.error('Error:', error);
    }
})();
