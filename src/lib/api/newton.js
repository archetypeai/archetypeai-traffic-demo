// Stateless analysis against Newton C 2.6 via /query — no session lifecycle.
// Each call is one self-contained request carrying the captured frame.
export async function analyze(rawBase64, query) {
	const body = { frame: rawBase64 };
	if (query) body.query = query;

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
