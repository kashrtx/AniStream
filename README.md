# AniStream

A modern anime streaming orientated browser that supports chrome extensions like MALSync for tracking application and UBlock Origin for ad blocking.

## Features

- **Modern Interface**: A sleek, responsive design optimized for anime streaming
- **Extension Support**: Native browser extension support, including MALSync and uBlock Origin
- **Smart URL Detection**: Automatically completes URLs and fetches site favicons
- **Bookmarks & History**: Keep track of your favorite anime and continue watching where you left off
- **Contained Browsing**: All content loads within the app, no external browser needed
- **Customization**: Themes, default start page, and other personalization options

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/AniStream.git
   cd AniStream
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the application:
   ```
   npm start
   ```

## Usage

### Adding Sources

1. Navigate to the Sources tab
2. Enter the URL of an anime streaming site (e.g., animepahe.ru, hianime.to)
3. Click 'Add' - the app will automatically fetch the site's favicon and title

### Installing Extensions

1. Go to the Settings tab
2. Under 'Extensions', click 'Install Extension'
3. Provide the path to an unpacked extension (e.g., downloaded MALSync or uBlock Origin)

### Browsing Anime

1. Click the 'Browse' button on any source to open it within the app
2. Use the browser controls to navigate, bookmark, and track your progress
3. Bookmarked anime will appear on your Home page for quick access

## Extension Support

AniStream uses Electron's Chrome extension API to support a variety of extensions. Tested and recommended extensions include:

- **MALSync**: For synchronizing your watched anime with MyAnimeList
- **uBlock Origin**: For blocking ads on streaming sites

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application is for educational purposes only. Please support the anime industry by using legal streaming services when available.
