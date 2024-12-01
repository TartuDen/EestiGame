// funcs.js
import getRandomWordAndTranslations from "./word_selector.js";
import { less_struggle_word_interval, struggle_barrier } from "./settings.js";
import fs from 'fs';
import csv from 'csv-parser';
import bcrypt from 'bcrypt';
const SALT_ROUNDS = 10;



function calculateXpForNextLevel(level) {
  const base = 100;
  const exponent = 1.5;
  return Math.floor(base * Math.pow(level, exponent));
}

function addExperience(user_info, xpGained) {
  user_info.current_xp += xpGained;

  // Check if the user has enough XP to level up
  while (user_info.current_xp >= calculateXpForNextLevel(user_info.level)) {
    user_info.current_xp -= calculateXpForNextLevel(user_info.level);
    user_info.level += 1;
  }

  return user_info;
}

function subtractExperience(user_info, xpLost) {
  // Subtract XP from the user's current XP
  user_info.current_xp -= xpLost;

  // Ensure current XP does not fall below zero
  if (user_info.current_xp < 0) {
    user_info.current_xp = 0;
  }

  // Do not modify the level, even if XP falls below the level threshold

  return user_info;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}


async function selectWordForUser(req) {
  try {
    let selectedWord, additionalWords;

    // Initialize word count if it doesn't exist
    if (!req.session.wordCount) {
      req.session.wordCount = 0;
    }

    // Increment word count for each call
    req.session.wordCount += 1;

    // Filter words where the user guessed wrongly > struggle_barrier of the time
    const struggledWords = req.session.userWordDetails.filter((wordDetail) => {
      const totalGuesses =
        wordDetail.guessed_correctly + wordDetail.guessed_wrong;
      const wrongPercentage = wordDetail.guessed_wrong / totalGuesses;
      return totalGuesses > 0 && wrongPercentage > struggle_barrier;
    });

    // Filter words where the user guessed wrongly <= struggle_barrier of the time
    const lessStruggledWords = req.session.userWordDetails.filter(
      (wordDetail) => {
        const totalGuesses =
          wordDetail.guessed_correctly + wordDetail.guessed_wrong;
        const wrongPercentage = wordDetail.guessed_wrong / totalGuesses;
        return totalGuesses > 0 && wrongPercentage <= struggle_barrier;
      }
    );

    if (
      req.session.wordCount % less_struggle_word_interval === 0 &&
      lessStruggledWords.length > 0
    ) {
      // Every 'less_struggle_word_interval'-th word: pick a word the user struggles with less
      const lessStruggledWordDetails =
        lessStruggledWords[getRandomInt(lessStruggledWords.length)];
      const lessStruggledWord = lessStruggledWordDetails.estonian_word; // Updated property name
      const totalGuesses =
        lessStruggledWordDetails.guessed_correctly +
        lessStruggledWordDetails.guessed_wrong;
      const wrongPercentage = (
        (lessStruggledWordDetails.guessed_wrong / totalGuesses) *
        100
      ).toFixed(2);

      console.log(
        `Selected less struggled word: ${lessStruggledWord}, Struggle %: ${wrongPercentage}%`
      );

      ({ selectedWord, additionalWords } = await getRandomWordAndTranslations(
        req.session.userSimpleWords,
        "words.csv",
        lessStruggledWord
      ));
    } else if (req.session.wordSelectionToggle) {
      // Toggle is true: Attempt to pick a word the user struggles with more
      if (struggledWords.length > 0) {
        const struggledWordDetails =
          struggledWords[getRandomInt(struggledWords.length)];
        const struggledWord = struggledWordDetails.estonian_word; // Updated property name
        const totalGuesses =
          struggledWordDetails.guessed_correctly +
          struggledWordDetails.guessed_wrong;
        const wrongPercentage = (
          (struggledWordDetails.guessed_wrong / totalGuesses) *
          100
        ).toFixed(2);

        console.log(
          `Selected struggled word: ${struggledWord}, Struggle %: ${wrongPercentage}%`
        );

        ({ selectedWord, additionalWords } = await getRandomWordAndTranslations(
          req.session.userSimpleWords,
          "words.csv",
          struggledWord
        ));
      } else {
        // No struggled words found, fallback to new word selection without specifying nextWord
        console.log("No struggled words found, selecting a new word.");
        ({ selectedWord, additionalWords } = await getRandomWordAndTranslations(
          req.session.userSimpleWords,
          "words.csv"
        ));
      }
    } else {
      // Toggle is false: Pick a completely new word
      console.log("Selected a completely new word.");
      ({ selectedWord, additionalWords } = await getRandomWordAndTranslations(
        req.session.userSimpleWords,
        "words.csv"
      ));
    }

    // Toggle the value for the next call
    req.session.wordSelectionToggle = !req.session.wordSelectionToggle;

    // Return the selected word and additional words
    return { selectedWord, additionalWords };
  } catch (error) {
    console.error("Error selecting word for user:", error);
    throw error;
  }
}


// funcs.js
function calculateAndSortWordStatistics(userWordDetails, struggle_barrier) {
  const statistics = userWordDetails.map((uw) => {
    const totalGuesses = uw.guessed_correctly + uw.guessed_wrong;
    const strugglePercent = totalGuesses > 0 ? ((uw.guessed_wrong / totalGuesses) * 100).toFixed(2) : '0';

    return {
      estonian_word: uw.estonian_word, // Use estonian_word instead of word
      struggle_percent: parseFloat(strugglePercent), // Convert string percentage to a number for filtering and sorting
      guessed: totalGuesses,
    };
  });

  // Filter by struggle percentage based on the struggle barrier
  const filteredStatistics = statistics.filter(stat => stat.struggle_percent / 100 > struggle_barrier);

  // Sort by struggle percent in descending order (highest % of wrong guesses at the top)
  filteredStatistics.sort((a, b) => b.struggle_percent - a.struggle_percent);

  // Convert the struggle percent back to string format with "%" sign
  return filteredStatistics.map((stat) => ({
      ...stat,
      struggle_percent: `${stat.struggle_percent}%`
  }));
}



async function searchWordInCSV(wordsArray) {
  if (Array.isArray(wordsArray)) {
    const csvData = [];

    // Load the entire CSV file into memory
    await new Promise((resolve, reject) => {
      fs.createReadStream('words.csv')
        .pipe(csv())
        .on('data', (data) => csvData.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // Iterate over the input array of words and add translations
    const updatedWordsArray = wordsArray.map((item) => {
      if (!item.estonian_word) {
        console.error('Item is missing estonian_word property:', item);
        return item; // Skip updating this item
      }

      const word = item.estonian_word.toLowerCase().trim();
      const matchedRow = csvData.find(row => row['Estonian Word'].toLowerCase().trim() === word);

      if (!matchedRow) {
        console.error(`No match found for word: ${word}`);
      }

      // Add the translation if the word is found
      return {
        ...item,
        translation: matchedRow ? matchedRow['English Translation'] : 'Not found'
      };
    });

    console.log('Updated Words Array:', updatedWordsArray);

    return updatedWordsArray;
  } else {
    throw new Error('Invalid input: wordsArray must be an array');
  }
}


async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

export {hashPassword, verifyPassword, calculateXpForNextLevel, addExperience, subtractExperience, selectWordForUser, calculateAndSortWordStatistics, searchWordInCSV }