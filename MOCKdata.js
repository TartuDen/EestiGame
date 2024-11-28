const user_statistic = {
    sessions: [
      {
        played_at: '2024-08-28T14:30:00', // ISO format date-time string
        experiance_gained: 63,// add here gained exp.
        words_played: 50,
        words_guessed_correctly: 40,
        time_played: 30 // Time in minutes
        
      },
      {played_at: '2024-08-29T10:15:00', // ISO format date-time string
        experiance_gained: 78,// add here gained exp.
        words_played: 60,
        words_guessed_correctly: 50,
        time_played: 45 // Time in minutes
        
      }
      // Additional sessions can be added here
    ]
  };

  const user_info = {
    level: 3,
    current_xp: 317,
  };
  
  const user_words = [
    {
      word: 'cat',
      guessed_correctly: 2,
      guessed_wrong: 0
    },
    {
      word: 'dog',
      guessed_correctly: 3,
      guessed_wrong: 1
    },
    {
      word: 'apple',
      guessed_correctly: 4,
      guessed_wrong: 2
    },
    {
      word: 'banana',
      guessed_correctly: 5,
      guessed_wrong: 1
    },
    {
      word: 'tree',
      guessed_correctly: 1,
      guessed_wrong: 2
    },
    {
      word: 'house',
      guessed_correctly: 6,
      guessed_wrong: 0
    },
    {
      word: 'river',
      guessed_correctly: 3,
      guessed_wrong: 3
    },
    {
      word: 'mountain',
      guessed_correctly: 2,
      guessed_wrong: 4
    },
    {
      word: 'car',
      guessed_correctly: 4,
      guessed_wrong: 1
    },
    {
      word: 'book',
      guessed_correctly: 7,
      guessed_wrong: 0
    },
    {
      word: 'elephant',
      guessed_correctly: 1,
      guessed_wrong: 3
    },
    {
      word: 'flower',
      guessed_correctly: 5,
      guessed_wrong: 0
    },
    {
      word: 'ocean',
      guessed_correctly: 2,
      guessed_wrong: 2
    },
    {
      word: 'sun',
      guessed_correctly: 8,
      guessed_wrong: 1
    },
    {
      word: 'moon',
      guessed_correctly: 3,
      guessed_wrong: 0
    }
  ];
  


//   Level 1: Requires 100 * (1^1.5) = 100 XP
//   Level 2: Requires 100 * (2^1.5) ≈ 283 XP
//   Level 3: Requires 100 * (3^1.5) ≈ 519 XP
//   Level 4: Requires 100 * (4^1.5) ≈ 800 XP
//   Level 5: Requires 100 * (5^1.5) ≈ 1120 XP
//   Level 10: Requires 100 * (10^1.5) ≈ 3162 XP


  export {user_info, user_statistic, user_words}