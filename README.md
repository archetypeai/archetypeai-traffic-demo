# Newton Traffic Demo

Real-time traffic monitoring dashboard powered by [Newton](https://www.archetypeai.io/) and a live Caltrans CCTV feed.

Analyzes the **US-101 at Spencer Avenue** camera (Sausalito, CA — Golden Gate Bridge approach) using Newton's C 2.6 fusion model, with an interactive chat for asking questions about current traffic conditions.

![Newton Traffic Demo](static/demo.png)

## Features

- **Live HLS stream** from Caltrans CCTV (720x480, US-101 northbound)
- **Automatic analysis** — Newton analyzes a short video clip every 8 seconds, reporting on traffic flow, vehicle density, incidents, and visibility, and whether traffic is building, clearing, or steady
- **Interactive chat** — ask Newton questions about what it sees on the camera
- **Analysis history** — scrolling log of observations with severity-coded labels (Normal, Congestion, Incident)
- **Status** — analysis count, last update time

## Stack

- **SvelteKit** with Svelte 5 runes
- **Archetype AI Design System** — semantic tokens, component primitives, composite patterns
- **Newton API** — C 2.6 fusion model via stateless `/api/lens/query` (short video clips: base64 JPEG frames + `query_metadata`)
- **hls.js** — HLS stream playback in the browser
- **Tailwind v4** — styling with semantic design tokens

## Setup

```bash
npm install
```

Create a `.env` file:

```
ATAI_API_KEY=your_api_key_here
ATAI_API_ENDPOINT=https://platform.u1.archetypeai.app
```

## Development

```bash
npm run dev
```

Open `http://localhost:5173`, then click **Start Analysis** to begin.

## Architecture

```
src/
├── routes/
│   ├── +page.svelte              # Dashboard orchestrator
│   └── api/
│       └── analyze/+server.js    # Stateless /api/lens/query proxy (video-clip analysis)
├── lib/
│   ├── server/newton.js          # Server-side Newton API client
│   ├── api/newton.js             # Client-side fetch wrappers
│   └── components/ui/
│       ├── primitives/           # DS registry primitives
│       ├── patterns/             # DS registry patterns
│       └── custom/               # Project-specific components
│           ├── traffic-feed.svelte    # HLS player + status overlay
│           ├── chat-panel.svelte      # Interactive Q&A with Newton
│           ├── analysis-log.svelte    # Scrolling analysis history
│           └── traffic-status.svelte  # Session & camera info
```

## How It Works

1. The HLS stream plays via hls.js in a `<video>` element (self-healing: recovers from transient stream errors)
2. **Start Analysis** begins the polling loop — no session to create; each call is a stateless `/api/lens/query`
3. Every 8 seconds, a short window of frames (4 @ ~1.3fps) is captured via canvas, encoded as base64 JPEG, and sent to Newton's `/api/lens/query` endpoint as one video clip (`multi_image: false` + `query_metadata`)
4. Newton's C 2.6 fusion model returns a traffic analysis — reasoning over motion across the clip — which is displayed in the Analysis panel with auto-inferred severity
5. Users can ask questions in the Chat panel — each question captures the current clip and sends it with the custom query to Newton
