<div align="center">
  <img src="app/favicon.ico" alt="GTB HINT TEST Logo" width="64" height="64" />
  <h1>GTB Platform</h1>
</div>

GTB Platform is a comprehensive training and statistics platform for Hypixel Guess The Build players, featuring three main components:

## `1` GTB Word Hint Training [👉 Here](https://gtb.zmh.me)

An interactive training program designed to help players improve their Guess The Build (GTB) skills:

- Practice with 1-3pt wordhints similar to actual gameplay
- Lamp icon (💡) for additional hint tips during practice
- Memory-based training to strengthen wordhint recall and recognition
- Score tracking system with progressive ranks (e.g. Rookie → Talented → Pro → Master)
- Challenge yourself to identify all possible answers to succeed

## `2` Build Battle Statistics Dashboard [👉 Here](https://gtb.zmh.me/stats)

A detailed analytics tool for tracking your Build Battle Stats:

- Comprehensive statistics across all game modes (Solo, Teams, Pro, GTB, SPB)
- Easy sharing via unique URLs (**https://gtb.zmh.me/stats?u=[player]**)
- Screenshot and save your stats with one click
- Dark/Light theme support
- Mobile-friendly responsive design

## `3` GTB Theme Search Engine [👉 Here](https://gtb.zmh.me/themes)

A powerful search engine sourced from the official Hypixel Crowdin database:

- Support for 24 languages with cross-language search capabilities
- Smart character handling that converts accented characters to ASCII (e.g., searching "podwoda" will match and highlight "Pod wodą")
- Toggle between fuzzy and exact matching search modes
- Keyword highlighting with integrated shortcut (SC) and multiword (MW) data lookup
- Advanced features for theme exploration and discovery

### Self Hosted

> For self-hosting needs, you can deploy your own instance. For normal usage, please use https://gtb.zmh.me directly.


[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzmh-program%2Fgtb_hinttest)

1. **Environment Variables**
   - Set up `HYPIXEL_API_KEY` in your Vercel project settings
   - Get your API key from Hypixel by [Hypixel Developers Dashboard](https://developer.hypixel.net)

3. **Domain Setup**
   - Add your custom domain through Vercel's dashboard
   - Vercel will automatically handle SSL certificates
