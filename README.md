# Jafris - Tetris Clone

[![GitHub Pages](https://img.shields.io/website?label=GitHub%20Pages&url=https%3A%2F%2Fdodjango.github.io%2Fjafris%2F)](https://dodjango.github.io/jafris/)
[![Deployment Status](https://img.shields.io/github/actions/workflow/status/dodjango/jafris/deploy.yml?label=Deployment)](https://github.com/dodjango/jafris/actions/workflows/deploy.yml)

Try the game here: [https://dodjango.github.io/jafris/](https://dodjango.github.io/jafris/)

An implementation of the classic Tetris game built with Vanilla JavaScript frontend. Features a sleek neon-cyberpunk design with responsive controls and audio feedback.
No backend is used, so the game is static and can be hosted on any static file hosting service. For development, I used Flask to serve the game.

![Jafris Game Screenshot](screenshot.png)

The name "Jafris" is a tribute to both my sons Jacob and Frederik, combining the first two letters of their names (Ja-Fr) with the "-is" suffix from the original game "Tetris".

## Project Origin
This project was created during a period of illness, where I experimented with AI-assisted development using [Cursor IDE](https://cursor.sh/)'s AI agent mode while recovering on my couch. The very first code of the game was actually created using Perplexity AI app on my iPhone and sent to my computer through a terminal app. However, as development progressed, I switched to using Cursor IDE on my notebook which proved to be much more comfortable and efficient. The entire codebase was generated through AI prompting, where I described the desired gameplay mechanics, visual aesthetics, and features. This serves as an interesting example of how AI can be used as a programming partner, with human creativity and direction guiding the AI to create a fully functional game. The result is a complete Tetris clone that demonstrates the capabilities of modern AI-assisted development.

## Features
- Classic Tetris gameplay mechanics
- Responsive design for desktop devices
- Keyboard controls
- Real-time score tracking and level progression
- Dynamic difficulty scaling
- Sound effects and background music
- Pause/Resume functionality
- Neon-cyberpunk visual theme

## Project Structure
```
jafris/
├── dev/
│   └── app.py           # Flask development server
├── assets/
│   ├── js/
│   │   └── game.js      # Game logic and controls
│   ├── css/
│   │   └── style.css    # Neon-themed styling
│   └── audio/           # Game sound effects
│       ├── theme-a.mp3
│       ├── rotate.mp3
│       ├── clear.mp3
│       ├── drop.mp3
│       ├── levelup.mp3
│       └── gameover.mp3
├── index.html           # Main game page
├── screenshot.png       # Game screenshot
└── README.md
```

## Prerequisites
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Python 3.x and Flask (for development only)

## Development

1. Install Flask:
   ```bash
   pip install flask
   ```

2. Start the development server:
   ```bash
   cd dev
   python app.py
   ```

3. Open your browser and navigate to [http://localhost:5000](http://localhost:5000)

## Deployment
The game can be deployed on any static file hosting service. The repository includes an automated GitHub Actions workflow for deployment to GitHub Pages.

1. GitHub Pages (Automated):
   - Push your changes to the main branch
   - The GitHub Actions workflow will automatically:
     - Build the static site
     - Bundle all assets (including audio files)
     - Deploy to GitHub Pages
   - You can monitor the deployment status in the [Actions tab](https://github.com/dodjango/jafris/actions)

2. Manual Deployment to Any Static Host:
   - Copy the following files to your web server:
     ```
     index.html
     assets/
     ```
   - Configure your web server to serve `index.html` as the default page

## Controls
- ←/→ : Move piece left/right
- ↑ : Rotate piece
- ↓ : Soft drop (faster fall)
- Space : Hard drop (instant fall)
- P : Pause game

## Scoring System
- Single line: 40 × level
- Double line: 100 × level
- Triple line: 300 × level
- Tetris (4 lines): 1200 × level
- Soft drop: 1 point per cell
- Hard drop: 2 points per cell

## Development Stack
- Vanilla JavaScript for game logic
- HTML5 Canvas for rendering
- CSS3 for neon styling and animations
- Web Audio API for sound effects
- Flask for development server (optional)

## Audio Credits
All sound effects and music are sourced from [Freesound.org](https://freesound.org/) under various Creative Commons licenses:

### Sound Effects
- `theme-a.mp3` - [Tetris Theme - Korobeiniki - Rearranged - Arr. for Strings](https://freesound.org/s/718634/) by Author
- `rotate.mp3` - [Warping](https://freesound.org/s/185849/) by LloydEvans09
- `clear.mp3` - [Chord 12](https://freesound.org/s/128818/) by mtcband
- `drop.mp3` - [Bottle Cap Drop](https://freesound.org/s/369707/) by Mrguff
- `levelup.mp3` - [10183 level up shock ding.wav](https://freesound.org/s/577392/) by Robinhood76
- `gameover.mp3` - [Game Over 01.wav](https://freesound.org/s/345666/) by MATRIXXX_

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. You are free to use, modify, and distribute this code in any way you want.

Enjoy playing!
