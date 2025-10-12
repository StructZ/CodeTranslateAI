import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Env {
	RATE_LIMIT: KVNamespace;
	LANG_TRANSLATION_ANALYTICS: KVNamespace;
	GEMINI_API_KEY: string;
}

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_REQUESTS_ALLOWED = 10;
const DURATION = 60_000;

async function checkRateLimit(ip: string, env: Env) {
	const key = `ip_key:${ip}`.toLowerCase();
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

async function updateAnalytics(source: string, dest: string, env: Env) {
	const key = `${source}-${dest}`;
	let value = await env.LANG_TRANSLATION_ANALYTICS.get(key);

	let data = { count: 0 };
	if (value) {
		try {
			data = JSON.parse(value);
		} catch {
			data = { count: 0 };
		}
	}

	data.count += 1; // increment usage count

	await env.LANG_TRANSLATION_ANALYTICS.put(key, JSON.stringify(data));
}
async function handleTranslate(request: Request, model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>, env: Env) {
	const { code, targetLanguage } = await request.json<{ code: string; targetLanguage: string }>();

	if (!code || !targetLanguage) {
		return new Response(JSON.stringify({ error: "Missing 'code' or 'targetLanguage' in request body." }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
	const sourceLanguage = await detectLanguage(code, model);
	const prompt = `Translate the following code snippet to ${targetLanguage}.
Do not add any explanation, commentary, or markdown formatting like \`\`\` around the code.
**IMPORTANT: Preserve all original comments and their exact placement in the translated code. Do not add extra spaces in between.**
Only provide the raw, translated code itself.

Original Code:
${code}`;

	const result = await model.generateContent(prompt);
	const translatedCode = result.response.text();
	await updateAnalytics(sourceLanguage, targetLanguage, env);
	return new Response(JSON.stringify({ translation: translatedCode, sourceLanguage }), {
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

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
			const allowed = await checkRateLimit(ip, env);
			if (!allowed) {
				return new Response(JSON.stringify({ error: 'Too many requests. Try again later.' }), {
					status: 429,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
			const url = new URL(request.url);
			const path = url.pathname;
			const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
			const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
			if (path === '/v1/analytics') {
				const list = await env.LANG_TRANSLATION_ANALYTICS.list();
				const stats: Record<string, any> = {};
				for (const key of list.keys) {
					const val = await env.LANG_TRANSLATION_ANALYTICS.get(key.name);
					stats[key.name] = JSON.parse(val || '{}');
				}
				return new Response(JSON.stringify(stats, null, 2), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			if (path === '/test-rate-limit') {
				return new Response(JSON.stringify('Proceed !'));
			}
			if (path === '/' || path === '/v1/translate') {
				return await handleTranslate(request, model, env);
			}

			if (path === '/v1/explain') {
				return await handleExplain(request, model);
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

async function detectLanguage(code: string, model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>) {
	const prompt = `Identify the programming language of the following code. 
Only respond with the exact language name (e.g., "python", "javascript", "c++", "java", etc.) without any extra text or punctuation.

Code:
${code}`;

	const result = await model.generateContent(prompt);
	return result.response.text().trim();
}
