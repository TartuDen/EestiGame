// server.js
// 1. Environment Setup
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import bcrypt from 'bcrypt';
import { Strategy as LocalStrategy } from "passport-local";


import {
  calculateXpForNextLevel,
  addExperience,
  subtractExperience,
  selectWordForUser,
  calculateAndSortWordStatistics,
  searchWordInCSV,
} from "./funcs.js";

import { createTables, pool, showUserStats } from "./pgTables.js";
import {
  getUser,
  regUser,
  getUserInfo,
  updateUserInfo,
  updateCorrectAnswer,
  updateWrongAnswer,
  userKnownWords,
} from "./apiCalls.js";
import sendEmail from "./mailer.js";
import { struggle_barrier } from "./settings.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081;
const SALT_ROUNDS = 10;



// 2. Database and Error Handling
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Ensure tables are created on server start
async function initializeDatabase() {
  try {
    await createTables();
    console.log("Database setup complete");
  } catch (err) {
    console.error("Error setting up database:", err);
  }
}
initializeDatabase();

// 3. Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Session middleware configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "someKeY",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1-hour session duration
  })
);

// Initialize Passport.js for authentication
app.use(passport.initialize());
app.use(passport.session());

// Middleware to start tracking user session
async function startSession(req, res, next) {
  if (req.isAuthenticated()) {
    const userId = req.user.id;
    await showUserStats(userId);


    const { userSimpleWords, userWordDetails } = await userKnownWords(userId);
    req.session.userSimpleWords = userSimpleWords;
    req.session.userWordDetails = userWordDetails;
    try {
      // Start a new session record
      const { rows } = await pool.query(
        `INSERT INTO sessions (user_id, played_at, experience_gained, words_played, words_guessed_correctly, time_played) 
        VALUES ($1, NOW(), 0, 0, 0, 0) RETURNING id`,
        [userId]
      );

      // Store session ID in the user's session object
      req.session.sessionId = rows[0].id;
      req.session.startTime = Date.now();
      req.session.experienceGained = 0;
      req.session.wordsPlayed = 0;
      req.session.wordsGuessedCorrectly = 0;
      req.session.user_info = await getUserInfo(userId);
      next();
    } catch (err) {
      next(new AppError("Failed to start session", 500));
    }
  } else {
    next(); // Continue if not authenticated
  }
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`[ERROR] ${statusCode} - ${message} - ${err.stack}`);
  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

// 4. Passport.js Strategies and Session Management
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8081/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        let apiResp = await getUser(profile.emails[0].value, "users");

        if (!apiResp) {
          const newUser = await regUser({
            user_name: profile.name.givenName,
            email: profile.emails[0].value,
            ava: profile.photos[0].value,
          });
          cb(null, newUser);
        } else {
          cb(null, apiResp); // User already exists
        }
      } catch (err) {
        console.error("Error during fetching user: ", err.message);
        cb(new AppError("Error during fetching user", 500));
      }
    }
  )
);

// Session management
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

// Function to end a session and record stats
async function endSession(req) {
  if (req.isAuthenticated() && req.session.sessionId) {
    const user = req.user;
    const sessionId = req.session.sessionId;
    const endTime = Date.now();
    const timePlayed = Math.floor((endTime - req.session.startTime) / 60000); // in minutes

    const experienceGained = req.session.experienceGained; // Example value; replace with actual logic
    const wordsPlayed = req.session.wordsPlayed; // Example value; replace with actual logic
    const wordsGuessedCorrectly = req.session.wordsGuessedCorrectly; // Example value; replace with actual logic

    // Convert comma-separated environment variable to an array
    const userToCheck = process.env.USER_TO_CHECK.split(',');
    if (userToCheck.includes(user.email)) {
      await sendEmail(user.email, experienceGained, wordsPlayed, wordsGuessedCorrectly);
    }


    try {
      await pool.query(
        `UPDATE sessions 
         SET experience_gained = $1, words_played = $2, words_guessed_correctly = $3, time_played = $4 
         WHERE id = $5`,
        [
          experienceGained,
          wordsPlayed,
          wordsGuessedCorrectly,
          timePlayed,
          sessionId,
        ]
      );
    } catch (err) {
      console.error("Failed to end session: ", err.message);
    }
  }
}


// Add Local Strategy
passport.use(
  "local",
  new LocalStrategy(
    { usernameField: "email" }, 
    async (email, password, done) => {
      try {
        let user = await getUser(email, "email_users");

        if (!user) {
          // If the user is not found, return false (handled by the route)
          return done(null, false);
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
          return done(null, false, { message: "Incorrect password." });
        }

        delete user.password;
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      // Redirect to /register if the user is not found
      return res.redirect('/register');
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/dashboard'); // or wherever you want to redirect on successful login
    });
  })(req, res, next);
});



// 5. Route Definitions
app.get("/register",async(req,res, next)=>{

})
app.post("/register", async (req, res, next) => {
  const { userName, email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await pool.query(
      'SELECT * FROM email_users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    // Register the new user
    const newUser = await regUserWEmail(userName, email, password);

    // Send a success response
    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    next(new Error('User registration failed'));
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});


app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",  // Redirect back to login page on failure
  }),
  startSession,  // Start session after successful login
  (req, res) => {
    res.redirect("/");  // Redirect to home page
  }
);


// ____________________Google OAuth routes
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "consent",
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  startSession, // Start the session after successful authentication

  (req, res) => {
    res.redirect("/");
  }
);



app.get("/", async (req, res, next) => {
  try {
    if (req.isAuthenticated()) {
      const user = req.user;
      const userId = req.user.id;
      const user_info = req.session.user_info;
      const total_exp = calculateXpForNextLevel(user_info.level);

      // Check if there's an unanswered word in the session
      if (req.session.unansweredWord) {
        return res.redirect("/wrong_answer");
      }

      // Select a new word for the user
      const { selectedWord, additionalWords } = await selectWordForUser(req);

      // Store the selected word in the session and mark it as unanswered
      req.session.selectedWord = selectedWord;
      req.session.unansweredWord = true;  // Mark the word as unanswered
      const sortedWordStatistics = calculateAndSortWordStatistics(req.session.userWordDetails,struggle_barrier);
      const wordStatsWithTranslations = await searchWordInCSV(sortedWordStatistics);

      const row = await searchWordInCSV(selectedWord['']);

      // console.log(".....selectW...\n",selectedWord);
      res.status(200).render("index.ejs", {
        user,
        user_info,
        total_exp,
        selectedWord,
        additionalWords,
        wordStatsWithTranslations,
      });
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    next(err);
  }
});


app.post("/correct_answer", async (req, res, next) => {
  try {
    if (req.isAuthenticated()) {
      const userId = req.user.id;
      const user_info = req.session.user_info;
      const selectedWord = req.session.selectedWord;
      const difficulty = parseInt(selectedWord.Difficulty, 10);
      const word = selectedWord["English Word"];

      // Update session values
      req.session.wordsPlayed += 1;
      req.session.experienceGained += difficulty;
      req.session.wordsGuessedCorrectly += 1;
      req.session.user_info = addExperience(user_info, difficulty);

      // Update the user_info and mark the word as answered
      await updateUserInfo(userId, req.session.user_info.level, req.session.user_info.current_xp);
      await updateCorrectAnswer(userId, word);

      // Remove the unanswered flag
      req.session.unansweredWord = false;

      res.redirect("/");
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    next(err);
  }
});


app.post("/wrong_answer", async (req, res, next) => {
  try {
    if (req.isAuthenticated()) {
      const userId = req.user.id;
      const user_info = req.session.user_info;
      const selectedWord = req.session.selectedWord;
      const word = selectedWord["English Word"];

      // Update session values
      req.session.wordsPlayed += 1;
      req.session.experienceGained -= 1;
      req.session.user_info = subtractExperience(user_info, 1);

      // Update the user_info and mark the word as answered
      await updateUserInfo(userId, req.session.user_info.level, req.session.user_info.current_xp);
      await updateWrongAnswer(userId, word);

      // Remove the unanswered flag
      req.session.unansweredWord = false;

      res.redirect("/");
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    next(err);
  }
});

app.get("/wrong_answer", async (req, res, next) => {
  try {
    if (req.isAuthenticated()) {
      const userId = req.user.id;
      const selectedWord = req.session.selectedWord;
      const word = selectedWord["English Word"];

      // Mark the word as incorrect in the database
      await updateWrongAnswer(userId, word);

      // Update session stats
      req.session.wordsPlayed += 1;
      req.session.experienceGained -= 1;
      req.session.user_info = subtractExperience(req.session.user_info, 1);

      // Remove the unanswered flag
      req.session.unansweredWord = false;

      // Redirect back to home page after handling wrong answer
      res.redirect("/");
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    next(err);
  }
});


app.get("/auth/logout", async (req, res) => {
  try {
    await endSession(req);
    req.logout((err) => {
      if (err) {
        console.error(err);
        res.redirect("/");
      } else {
        req.session.destroy(() => {
          res.redirect("/login");
        });
      }
    });
  } catch (err) {
    res.redirect("/login");
  }
});

// 6. Server Initialization
app.listen(PORT, (err) => {
  if (err) throw err;
  console.log(`Server is running on port ${PORT}`);
});

// Use the error handler middleware
app.use(errorHandler);
