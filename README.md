# 🎵 Friendify

A modern web application that provides daily song recommendations based on your friend's Spotify listening history, specifically based on their top five songs of the last month.

## ✨ Highlights

* Daily personalized song recommendations
* Beautiful metallic UI with glass morphism effects
* Real-time Spotify integration
* Responsive design for all devices
* Built with modern React and TypeScript
* Powered by Supabase for data management

## 🚀 Quick Start

### Prerequisites

* Node.js (v18 or higher)
* npm or yarn
* A Spotify account
* Supabase account (for database)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   * Copy `.env.example` to `.env.local`
   * Fill in your Spotify and Supabase credentials

2. Start supabase locally

```bash
supabase start
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🛠️ Tech Stack

* **Frontend**: React 18 with Vite
* **State Management**: React Query
* **Database**: Supabase
* **API Integration**: Spotify Web API
* **Styling**: CSS with glass morphism effects
* **Development**: TypeScript, ESLint

## 📦 Project Structure

```
daily-friend-songs/
├── src/               # Source code
├── public/            # Static assets
├── server/            # Express server for API
├── .env.example       # Example environment variables
└── package.json       # Project dependencies
```

## 🔧 Available Scripts

* `npm run dev` - Start development server
* `npm run build` - Build for production
* `npm run preview` - Preview production build
* `npm run lint` - Run ESLint
* `npm run server` - Start Express server

## 🌐 Environment Variables

Required environment variables:

```env
VITE_SPOTIFY_CLIENT_ID
VITE_REDIRECT_URI
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Pull the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

Created by Ethan - [GitHub Profile](https://github.com/yourusername)

## 🙏 Acknowledgments

* Spotify Web API
* Supabase team
* React and Vite communities
* All contributors and users of this project
