# GEO Experiment Platform UI

React + TypeScript participant and researcher client for the FastAPI study API.

```sh
git clone https://github.com/IntelegixLabs/GEO_Experiment_Platform_UI.git
cd GEO_Experiment_Platform_UI
npm install
npm run dev
```

The Vite development server runs at `http://127.0.0.1:5173` and proxies `/api`
to `http://127.0.0.1:8001`. Start from [`.env.example`](.env.example) when
creating a local `.env.local`. To use a different FastAPI address:

```text
VITE_API_PROXY_TARGET=http://127.0.0.1:8001
```

For a separately deployed API, set `VITE_API_BASE_URL` (for example,
`https://study.example.edu/api`) before `npm run build`. Participant components
never render the hidden `condition` or `pair_id` fields; they are only shown in
the researcher console.
