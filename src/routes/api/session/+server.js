import { json } from '@sveltejs/kit';
import { createSession, destroySession } from '$lib/server/newton.js';

const INSTRUCTION =
	'You are a traffic monitoring AI analyzing a live Caltrans CCTV camera feed. ' +
	'Camera location: N101 at Spencer Avenue, Sausalito, CA — the northbound US-101 approach to the Golden Gate Bridge. ' +
	'This is a key corridor connecting Marin County to San Francisco. Traffic flows north-south on a multi-lane divided highway. ' +
	'The speed limit in this section is 55 mph.';
const FOCUS =
	'Answer questions about the traffic camera image.';

export async function POST() {
	try {
		const { sessionId, lensId } = await createSession(INSTRUCTION, FOCUS);
		return json({ sessionId, lensId, instruction: INSTRUCTION, focus: FOCUS });
	} catch (err) {
		return json({ error: err.message }, { status: 500 });
	}
}

export async function DELETE({ request }) {
	try {
		const { sessionId } = await request.json();
		await destroySession(sessionId);
		return json({ ok: true });
	} catch (err) {
		return json({ error: err.message }, { status: 500 });
	}
}
