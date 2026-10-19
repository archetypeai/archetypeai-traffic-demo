// Stateless analysis against Newton C 2.6 via /api/lens/query — no session lifecycle.
// Each call sends a short window of frames as one video clip; `rawFps` is the
// sampling rate the frames were captured at (used to build query_metadata).
export async function analyze(frames, query, rawFps) {
	const body = { frames };
	if (query) body.query = query;
	if (rawFps) body.rawFps = rawFps;

	const res = await fetch('/api/analyze', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || 'Analysis failed');
	}
	return res.json();
}
