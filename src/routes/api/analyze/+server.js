import { json } from '@sveltejs/kit';
import { analyzeFrames } from '$lib/server/newton.js';

const INSTRUCTION =
	'You are a traffic monitoring AI analyzing a live Caltrans CCTV camera feed. ' +
	'Camera location: N101 at Spencer Avenue, Sausalito, CA — the northbound US-101 approach to the Golden Gate Bridge. ' +
	'This is a key corridor connecting Marin County to San Francisco. Traffic flows north-south on a multi-lane divided highway. ' +
	'The speed limit in this section is 55 mph. ' +
	'You are shown a short sequence of frames sampled from the live feed over a few seconds — treat them as one short video clip and reason about motion and change across the frames, not just a single snapshot.';
const DEFAULT_QUERY =
	'Describe current traffic conditions: flow level (free/light/moderate/heavy/stopped), approximate vehicle count visible, any incidents or hazards, and visibility/weather conditions. ' +
	'Also note whether traffic is building, clearing, or steady across the clip and the general direction and speed of movement.';

export async function POST({ request }) {
	try {
		const { frames, query, rawFps } = await request.json();
		if (!Array.isArray(frames) || frames.length === 0) {
			return json({ error: 'Missing frames' }, { status: 400 });
		}
		const analysis = await analyzeFrames(frames, INSTRUCTION, query || DEFAULT_QUERY, rawFps || 1);
		return json({ analysis, timestamp: Date.now() });
	} catch (err) {
		return json({ error: err.message }, { status: 500 });
	}
}
