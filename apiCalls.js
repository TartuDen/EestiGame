// apiCalls.js
import { pool } from "./pgTables.js";

async function getUser(email) {
  try {
    const client = await pool.connect();
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await client.query(query, [email]);
    client.release(); // Release the client back to the pool

    if (result.rows.length === 0) {
      return null; // User not found, return null instead of using `res`
    }
    return result.rows[0];
  } catch (error) {
    console.error("Error fetching user:", error);
    throw new Error("Internal server error"); // Throw an error to be caught by the calling function
  }
  // Remove the pool.end() call here
}

async function regUser(user) {
  const { user_name, email, password } = user;

  try {
    const client = await pool.connect();
    const query = `
      INSERT INTO users (user_name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *`;
    const values = [user_name, email, password];
    const result = await client.query(query, values);
    client.release(); // Release the client back to the pool

    return result.rows[0]; // Return the newly registered user object
  } catch (error) {
    console.error("Error registering user:", error);
    if (error.code === "23505") {
      throw new Error("Email already exists"); // Handle unique constraint violation
    } else {
      throw new Error("Internal server error");
    }
  }
}


// Function to get user information
async function getUserInfo(userId) {
  try {
    // Try to get the user information
    const { rows } = await pool.query(
      `SELECT * FROM user_info WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      // If user info is not found, create a new entry with level 0 and current_xp 0
      const { rows: newRows } = await pool.query(
        `INSERT INTO user_info (user_id, level, current_xp)
               VALUES ($1, $2, $3)
               RETURNING *`,
        [userId, 0, 0]
      );
      return newRows[0]; // Return the newly created user info
    }

    return rows[0]; // Return the found user info
  } catch (err) {
    console.error("Error getting or creating user info:", err.message);
    throw err;
  }
}

// Function to update user information
async function updateUserInfo(userId, level, currentXp) {
  try {
    const result = await pool.query(
      `UPDATE user_info
           SET level = $1, current_xp = $2
           WHERE user_id = $3
           RETURNING *`,
      [level, currentXp, userId]
    );

    if (result.rowCount === 0) {
      throw new Error("User info not found or update failed");
    }

    return result.rows[0];
  } catch (err) {
    console.error("Error updating user info:", err.message);
    throw err;
  }
}

async function updateCorrectAnswer(userId, word) {
  try {
    // Upsert into user_words table for a correct answer
    await pool.query(
      `
      INSERT INTO user_words (user_id, word, guessed_correctly, guessed_wrong)
      VALUES ($1, $2, 1, 0)
      ON CONFLICT (user_id, word)
      DO UPDATE SET guessed_correctly = user_words.guessed_correctly + 1;
    `,
      [userId, word]
    );
  } catch (err) {
    console.error("Error updating correct answer:", err.message);
    throw err;
  }
}

async function updateWrongAnswer(userId, word) {
  try {
    // Upsert into user_words table for a wrong answer
    await pool.query(
      `
      INSERT INTO user_words (user_id, word, guessed_wrong, guessed_correctly)
      VALUES ($1, $2, 1, 0)
      ON CONFLICT (user_id, word)
      DO UPDATE SET guessed_wrong = user_words.guessed_wrong + 1;
    `,
      [userId, word]
    );
  } catch (err) {
    console.error("Error updating wrong answer:", err.message);
    throw err;
  }
}

async function userKnownWords(userId) {
  try {
    // Query the database to get words that the user has already interacted with
    const userWordsQuery = `
      SELECT estonian_word, guessed_correctly, guessed_wrong
      FROM user_words 
      WHERE user_id = $1;
    `;
    const { rows: userWords } = await pool.query(userWordsQuery, [userId]);

    // Extract the words from the query result
    const userSimpleWords = userWords.map((uw) => uw.estonian_word);

    // Return both the list of known words and the entire userWords object
    return {
      userSimpleWords,  // simplified list of words
      userWordDetails: userWords  // detailed objects with estonian_word, guessed_correctly, and guessed_wrong
    };
  } catch (error) {
    console.error('Error fetching user known words:', error);
    throw error;
  }
}




export {
  getUser,
  regUser,
  getUserInfo,
  updateUserInfo,
  updateCorrectAnswer,
  updateWrongAnswer,
  userKnownWords,
};

