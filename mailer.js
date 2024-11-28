import nodemailer from 'nodemailer';
import dotenv from "dotenv";



dotenv.config();


// Function to send email
async function sendEmail(userEmail, experienceGained, wordsPlayed, wordsGuessedCorrectly) {

  // Create a transporter using SMTP
  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Replace with your SMTP server
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.GMAIL, // Your email address
      pass: process.env.GMAIL_PASS, // Your email password
    },
  });

  // Create the email content
  let mailOptions = {
    from: '"Your App Name" <your-email@example.com>', // Sender address
    to: userEmail, // Receiver's email
    subject: 'Game Summary', // Subject line
    text: `Here is the summary of your game:\n\nExperience Gained: ${experienceGained}\nWords Played: ${wordsPlayed}\nWords Guessed Correctly: ${wordsGuessedCorrectly}`, // Plain text body
    html: `<h3>Here is the summary of your game:</h3><p><strong>Experience Gained:</strong> ${experienceGained}</p><p><strong>Words Played:</strong> ${wordsPlayed}</p><p><strong>Words Guessed Correctly:</strong> ${wordsGuessedCorrectly}</p>`, // HTML body
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log('Error sending email:', error);
    }
    // console.log('Message sent: %s', info.messageId);
  });
}

export default sendEmail;
