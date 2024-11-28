# Word Game for Kids

This is a simple and educational word game designed for kids to help them learn new words and improve their vocabulary. The game presents words from a CSV file and tracks the user's progress, selecting new words to challenge them and reinforcing words they struggle with.

## Features

- **Random Word Selection:** The game selects words randomly from a CSV file, ensuring a varied learning experience.
- **Adaptive Learning:** The game tracks which words the user struggles with and adjusts the word selection to help improve their retention.
- **User Progress Tracking:** The game records the user's performance, allowing for personalized word selection based on past performance.
- **Easy Installation:** The game is easy to set up and run on your local machine.

## Installation

### Option1: Using Docker

1. **Install Docker:**
   - Follow the [official Docker installation guide](https://docs.docker.com/get-docker/) for your operating system.

2. **Clone the Repository:**
   ```bash
   git clone https://github.com/TartuDen/WordGame2
   cd WordGame2
   ```
3. **Create and Configure Docker Environment:**
   - Create a .env file in the root directory if it doesn’t already exist and add your environment variables. For example:
   ```bash
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   DB_PASS=your_postgresql_password
   DB_PORT=5432
   SESSION_SECRET=your_session_secret
   ```
4. **Build and Start the Docker Containers:** Run the following command to build and start the application and database containers:
```bash
docker-compose up --build
```
5. **Access the Game:** Open your browser and navigate to http://localhost:8081 to start playing.

### Option2: Without Docker
1. **Install Dependencies:** Make sure you have Node.js installed. Then run:
```bash
npm install
```
2. **Set Up Environment Variables:** Create a .env file in the root directory and add your environment variables. Example:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
DB_PASS=your_postgresql_password
DB_PORT=5432
```
3. **Run the Game:**
```bash
npm start
```

4. **Access the Game:** Open your browser and navigate to http://localhost:8081 to start playing.

## Game Logic
**Word Selection Process**
1. ***Initial Setup:***
* The game reads a list of words from a CSV file.
* It also keeps track of words the user has already encountered, how many times they guessed them correctly, and how many times they guessed them wrong.

2. ***Adaptive Word Selection:***
* Struggled Words: Words that the user has guessed wrong more than 20% of the time are considered "struggled words." The game prioritizes these words to help reinforce learning.
* Less Difficult Words: Every 5th word selected by the game is a word that the user has guessed wrong less than 20% of the time. This helps to review less difficult words periodically.
* New Words: If no struggled words are found, or based on the word selection interval, the game selects a new word that the user has not encountered before.

3. ***Detailed Word Selection:***
* The function selectWordForUser alternates between selecting a new word or a word the user struggles with.
* It toggles between these two modes to balance learning new words and reinforcing old ones.
* The struggle percentage is logged to provide visual feedback on how the words are selected based on user performance.

## Example Flow
* First Selection: A new word that the user hasn't encountered before is selected.
* Second Selection: A word that the user has struggled with (if any) is selected.
* Every 5th Selection: A less difficult word (guessed wrong <20% of the time) is selected to review.

## Contributing
Feel free to fork this repository and submit pull requests to improve the game. Contributions are welcome!

## License
This project is open-source and available under the MIT License.
