# Leaf & Learn

A plant identification flashcard game designed for horticulture students. Built as a Progressive Web App (PWA) with offline support.

## Features

- **Flashcard Quiz**: Learn to identify 7 common plants with scientific names
- **Memory Aids**: Each plant has a memorable mnemonic to help retention
- **Mastery System**: Track progress with a 0-3 mastery level per plant
- **Spaced Repetition**: Plants you struggle with appear more frequently
- **Streak Tracking**: Build and maintain answer streaks for motivation
- **Offline Support**: Full PWA - works without internet connection
- **Mobile-First**: Optimised for touch devices with responsive design

## Plants Included

1. **Monstera deliciosa** (Swiss Cheese Plant)
2. **Cymbidium spp.** (Cymbidium Orchid)
3. **Schefflera arboricola** (Umbrella Plant)
4. **Bromeliad sp.** (Bromeliad)
5. **Rhipsalis crispata** (Hanging Cacti)
6. **Crassula ovata** (Jade Plant / Money Plant)
7. **Sansevieria** (Snake Plant / Mother-in-law's Tongue)

## Running Locally

The app requires a local server due to service worker requirements. Options:

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

### Debug URL Parameters

- `?celebrate` - Skip to the perfect score celebration screen for testing

## Installing as PWA

On mobile or desktop, look for the "Install" prompt or use your browser's "Add to Home Screen" / "Install App" option.

## Tech Stack

- [Phaser 3](https://phaser.io/) - Game framework
- Vanilla JavaScript
- CSS3 with custom properties
- Service Worker for offline caching

## Project Structure

```
leaf-and-learn/
├── index.html          # Main HTML entry point
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
├── css/
│   └── styles.css     # Global styles
├── js/
│   ├── plants.js      # Plant database
│   └── game.js        # Phaser game logic
├── images/            # Plant photographs
└── icons/             # PWA icons
```

## Licence

MIT
