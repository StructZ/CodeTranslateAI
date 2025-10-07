import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Env {
	RATE_LIMIT: KVNamespace;
	GEMINI_API_KEY: string;
	FEEDBACK_STORE: KVNamespace;
}

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_REQUESTS_ALLOWED = 10;
const DURATION = 60_000;

async function checkRateLimit(ip: string, env: Env) {
	const key = `ip_key:${ip}`;
	const now = Date.now();
	let value = await env.RATE_LIMIT.get(key);
	let data = { count: 0, time: now };

	if (value) {
		try {
			data = JSON.parse(value);
		} catch {
			data = { count: 0, time: now };
		}
	}

	if (now - data.time > DURATION) {
		data.count = 0;
		data.time = now;
	}

	data.count += 1;
	await env.RATE_LIMIT.put(key, JSON.stringify(data), { expirationTtl: 65 });

	return data.count <= MAX_REQUESTS_ALLOWED;
}
async function handleTranslate(request: Request, model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>) {
	const { code, targetLanguage } = await request.json<{ code: string; targetLanguage: string }>();

	if (!code || !targetLanguage) {
		return new Response(JSON.stringify({ error: "Missing 'code' or 'targetLanguage' in request body." }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	const prompt = `Translate the following code snippet to ${targetLanguage}.
Do not add any explanation, commentary, or markdown formatting like \`\`\` around the code.
**IMPORTANT: Preserve all original comments and their exact placement in the translated code. Do not add extra spaces in between.**
Only provide the raw, translated code itself.

Original Code:
${code}`;

	const result = await model.generateContent(prompt);
	const translatedCode = result.response.text();

	return new Response(JSON.stringify({ translation: translatedCode }), {
		status: 200,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

async function handleExplain(request: Request, model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>) {
	const { code } = await request.json<{ code: string }>();

	if (!code) {
		return new Response(JSON.stringify({ error: "Missing 'code' in request body." }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	const prompt = `Explain the following code snippet in detail:
1. Provide a clear breakdown of what each part (functions, variables, logic blocks) does.
2. If applicable, describe the overall purpose or intent of the code.
3. Offer a step-by-step explanation of how the code executes.
4. If the code is executable, show a sample input and the corresponding output.
5. Keep the explanation beginner-friendly but technically accurate.

Code:
${code}`;

	const result = await model.generateContent(prompt);
	const explanation = result.response.text();

	return new Response(JSON.stringify({ explanation }), {
		status: 200,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

async function handleFeedback(request: Request, env: Env) {
	const feedback = await request.json<{
		isPositive: boolean;
		targetLanguage: string;
		originalCode: string;
		translatedCode: string;
		comment?: string;
		timestamp: string;
	}>();

	if (!feedback.targetLanguage || !feedback.originalCode || !feedback.translatedCode) {
		return new Response(JSON.stringify({ error: "Missing required feedback fields." }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	// Generate a unique ID for the feedback
	const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substring(7)}`;
	
	// Store feedback in KV
	try {
		await env.FEEDBACK_STORE.put(feedbackId, JSON.stringify(feedback), {
			metadata: {
				isPositive: feedback.isPositive,
				targetLanguage: feedback.targetLanguage,
				timestamp: feedback.timestamp
			}
		});

		return new Response(JSON.stringify({ 
			success: true, 
			message: "Feedback submitted successfully",
			feedbackId 
		}), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error storing feedback:', error);
		return new Response(JSON.stringify({ error: 'Failed to store feedback.' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      		const allowed = await checkRateLimit(ip, env);
      		if (!allowed) {
        		return new Response(JSON.stringify({ error: "Too many requests. Try again later." }), {
          		status: 429,
          		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        	});
      		}
			const url = new URL(request.url);
			const path = url.pathname;
			const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
			const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

			if(path==="/test-rate-limit"){
				return new Response(JSON.stringify("Proceed !"))
			}
			if (path === '/' || path === '/v1/translate') {
				return await handleTranslate(request, model);
			}

			if (path === '/v1/explain') {
				return await handleExplain(request, model);
			}

			if (path === '/v1/feedback') {
				return await handleFeedback(request, env);
			}

			return new Response(JSON.stringify({ error: 'Route not found.' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (error) {
			console.error('Error during request:', error);
			return new Response(JSON.stringify({ error: 'An internal error occurred.' }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
