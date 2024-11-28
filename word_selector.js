// word_selector.js
import fs from 'fs';
import { parse } from 'csv-parse';

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// Function to get a random word and translations
async function getRandomWordAndTranslations(userSimpleWords, filePath, nextWord = null) {
    try {
        // Step 1: Read the CSV file to get the complete word list
        const data = await fs.promises.readFile(filePath);

        const words = await new Promise((resolve, reject) => {
            const lines = data.toString().split('\n');
            let lineNumber = 0;

            parse(data, {
                columns: true,
                trim: true,
            }, (err, output) => {
                if (err) {
                    // Capture line number for the error
                    lineNumber = lines.findIndex(line => line.includes(err.message.split('\n')[0])) + 1;
                    return reject(`Error parsing CSV at line ${lineNumber}: ${err.message}`);
                }
                resolve(output);
            });
        });

        let selectedWord;

        if (nextWord) {
            // If nextWord is provided, find it in the words array by matching against the Estonian word
            selectedWord = words.find(word => word['Estonian Word'] === nextWord);
            if (!selectedWord) {
                throw new Error('Provided nextWord not found in the word list.');
            }
        } else {
            // Step 2: Filter out words already known to the user based on their Estonian words
            const newWords = words.filter(word => 
                !userSimpleWords.includes(word['Estonian Word'])
            );

            if (newWords.length === 0) {
                throw new Error('No new words available for the user.');
            }

            // Step 3: Randomly select a new word from the remaining words
            const selectedWordIndex = getRandomInt(newWords.length);
            selectedWord = newWords[selectedWordIndex];
        }

        // Step 4: Get the category of the selected word
        const category = selectedWord.Category;

        // Step 5: Select additional words from the same category
        let sameCategoryWords = words.filter(word =>
            word.Category === category && word['English Translation'] !== selectedWord['English Translation']
        );

        const additionalWords = [];
        while (additionalWords.length < Math.min(4, sameCategoryWords.length)) {
            const randomIndex = getRandomInt(sameCategoryWords.length);
            const word = sameCategoryWords.splice(randomIndex, 1)[0];
            additionalWords.push(word);
        }

        // Step 6: Check if the 'Example Sentence' column exists and if it contains data
        const hasExampleColumn = 'Example Sentence' in selectedWord;

        // Step 7: Include the example sentence if provided, otherwise use an empty string
        const selectedWordExample = hasExampleColumn ? (selectedWord['Example Sentence'] || "") : "";

        // Adding example to each additional word
        const additionalWordsWithExamples = additionalWords.map(word => ({
            ...word,
            'Example Sentence': hasExampleColumn ? (word['Example Sentence'] || "") : ""
        }));

        // Return selected word with example and additional words
        return { 
            selectedWord: { ...selectedWord, 'Example Sentence': selectedWordExample }, 
            additionalWords: additionalWordsWithExamples 
        };
    } catch (err) {
        console.error('Error selecting a word:', err);
        throw err;
    }
}

export default getRandomWordAndTranslations;
