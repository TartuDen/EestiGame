// pgTables.js
import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import { calculateXpForNextLevel } from "./funcs.js";

dotenv.config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'db',
  database: process.env.POSTGRES_DB || 'wordgame2',
  password: process.env.POSTGRES_PASSWORD || '123',
  port: process.env.POSTGRES_PORT || 5432,
});

function displayUserProgressInTerminal(userStats) {
  // Find the max experience for scaling the XP bar
  const maxExperience = Math.max(
    1, // Ensure maxExperience is at least 1 to avoid division by zero or negative scaling
    ...userStats.progressData.map((data) => data.experience)
  );

  console.log("\nUser Progress Over Time\n");

  userStats.progressData.forEach((data, index) => {
    const levelBar = "■".repeat(Math.max(1, data.level)); // Ensure the level bar has at least 1 block
    const expBar = "■".repeat(Math.max(0, (data.experience / maxExperience) * 50)); // Ensure a non-negative XP bar

    // Display the date and level on the same line
    console.log(`${new Date(data.date).toDateString()}:\n[${levelBar}] Level ${data.level}`);

    // Display the XP bar on the next line
    console.log(`[${expBar}] ${data.experience} XP\n`);
  });
}

async function getUserStats(userId) {
  try {
    // Fetch all sessions for the user
    const { rows } = await pool.query(
      `
      SELECT played_at, experience_gained, words_played, words_guessed_correctly, time_played 
      FROM sessions 
      WHERE user_id = $1 
      ORDER BY played_at ASC
      `,
      [userId]
    );

    if (rows.length === 0) {
      throw new Error("No session data found for this user");
    }

    let progressData = [];
    let totalWordsPlayed = 0;
    let totalWordsGuessedCorrectly = 0;
    let totalTimePlayed = 0;
    let currentLevel = 0;
    let currentXp = 0;

    for (let session of rows) {
      totalWordsPlayed += session.words_played;
      totalWordsGuessedCorrectly += session.words_guessed_correctly;
      totalTimePlayed += session.time_played;

      currentXp += session.experience_gained;
      while (currentXp >= calculateXpForNextLevel(currentLevel)) {
        currentXp -= calculateXpForNextLevel(currentLevel);
        currentLevel += 1;
      }

      progressData.push({
        date: session.played_at,
        level: currentLevel,
        experience: currentXp,
      });
    }

    return {
      progressData,
      totalWordsPlayed,
      totalWordsGuessedCorrectly,
      totalTimePlayed,
    };
  } catch (err) {
    console.error("Error fetching user stats:", err.message);
    throw err;
  }
}

async function showUserStats(userId) {
  try {
    // Fetch the logged-in user's data (replace `userId` with the actual user ID)
    const userStats = await getUserStats(userId);
    console.log("........userStats......\n", userStats);

    // Display user progress in the terminal
    displayUserProgressInTerminal(userStats);

    // Cleanup old sessions (older than 5 days)
    const deleteResult = await pool.query(`
      DELETE FROM sessions 
      WHERE played_at < NOW() - INTERVAL '5 days';
    `);

    console.log(`${deleteResult.rowCount} old session(s) deleted.`);
  } catch (error) {
    console.error("Error retrieving user stats:", error);
  }
}

async function createTables() {
  try {
    await pool.connect();

    // Create the users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        ava TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_users (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create the user_info table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_info (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        level INTEGER NOT NULL,
        current_xp INTEGER NOT NULL
      );
    `);

    // Create the sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        played_at TIMESTAMP NOT NULL,
        experience_gained INTEGER NOT NULL,
        words_played INTEGER NOT NULL,
        words_guessed_correctly INTEGER NOT NULL,
        time_played INTEGER NOT NULL -- Time in minutes
      );
    `);

    // Create the user_words table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_words (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        estonian_word VARCHAR(100) NOT NULL, -- Changed 'word' to 'estonian_word'
        guessed_correctly INTEGER NOT NULL,
        guessed_wrong INTEGER NOT NULL,
        CONSTRAINT user_word_unique UNIQUE(user_id, estonian_word) -- Updated constraint
      );
    `);

    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}

export { createTables, pool, showUserStats };
