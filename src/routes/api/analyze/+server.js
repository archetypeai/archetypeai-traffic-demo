import { json } from '@sveltejs/kit';
import { analyzeFrame } from '$lib/server/newton.js';

const INSTRUCTION =
	'You are a traffic monitoring AI analyzing a live Caltrans CCTV camera feed. ' +
	'Camera location: N101 at Spencer Avenue, Sausalito, CA — the northbound US-101 approach to the Golden Gate Bridge. ' +
	'This is a key corridor connecting Marin County to San Francisco. Traffic flows north-south on a multi-lane divided highway. ' +
	'The speed limit in this section is 55 mph.';
const DEFAULT_FOCUS =
	'Describe current traffic conditions: flow level (free/light/moderate/heavy/stopped), approximate vehicle count visible, any incidents or hazards, and visibility/weather conditions.';

export async function POST({ request }) {
	try {
		const { sessionId, frame, query } = await request.json();
		if (!sessionId || !frame) {
			return json({ error: 'Missing sessionId or frame' }, { status: 400 });
		}
		const focus = query || DEFAULT_FOCUS;
		const analysis = await analyzeFrame(sessionId, frame, INSTRUCTION, focus);
		return json({ analysis, timestamp: Date.now() });
	} catch (err) {
		return json({ error: err.message }, { status: 500 });
	}
}
