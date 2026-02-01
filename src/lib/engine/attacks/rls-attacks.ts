/**
 * RLS Bypass Attacks
 * Tests for Row Level Security policy vulnerabilities
 */

import type { AttackVector, AttackContext, AttackResult } from '$lib/types/attacks';

/**
 * Helper to make authenticated requests to Supabase REST API
 */
async function supabaseRequest(
	url: string,
	apiKey: string,
	options: RequestInit = {}
): Promise<Response> {
	return fetch(url, {
		...options,
		headers: {
			apikey: apiKey,
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			Prefer: 'return=representation',
			...options.headers
		}
	});
}

/**
 * RLS Attack Vectors
 */
export const rlsAttacks: AttackVector[] = [
	{
		id: 'rls-horizontal-bypass',
		name: 'Horizontal Privilege Escalation',
		description: 'Attempts to access other users data by manipulating queries',
		category: 'rls',
		severity: 'critical',
		tags: ['rls', 'privilege-escalation', 'horizontal'],
		execute: async (ctx: AttackContext): Promise<AttackResult> => {
			// Try common patterns to bypass user_id checks
			const bypasses = [
				'user_id=neq.00000000-0000-0000-0000-000000000000',
				'user_id=is.null',
				'or=(user_id.is.null,id.gt.0)',
				'select=*,other_users:users(*)'
			];

			const breachedPatterns: string[] = [];

			for (const bypass of bypasses) {
				try {
					const response = await supabaseRequest(
						`${ctx.targetUrl}/rest/v1/profiles?${bypass}&limit=5`,
						ctx.anonKey
					);

					if (response.ok) {
						const data = await response.json();
						if (Array.isArray(data) && data.length > 1) {
							breachedPatterns.push(bypass);
						}
					}
				} catch {
					// Continue
				}
			}

			const breached = breachedPatterns.length > 0;

			return {
				attackId: 'rls-horizontal-bypass',
				status: breached ? 'breached' : 'secure',
				breached,
				summary: breached
					? `Found ${breachedPatterns.length} query patterns that bypass RLS`
					: 'No horizontal privilege escalation detected',
				details: {},
				evidence: breached ? { patterns: breachedPatterns } : undefined,
				timestamp: new Date().toISOString(),
				duration: 0
			};
		}
	},
	{
		id: 'rls-insert-bypass',
		name: 'Unauthorized INSERT',
		description: 'Attempts to insert data into tables without proper authorization',
		category: 'rls',
		severity: 'high',
		tags: ['rls', 'insert', 'write'],
		execute: async (ctx: AttackContext): Promise<AttackResult> => {
			const tables = ['profiles', 'users', 'data', 'items'];
			const successful: string[] = [];

			for (const table of tables) {
				try {
					const testData = {
						id: '00000000-0000-0000-0000-000000000000',
						test_field: `supashield_test_${Date.now()}`
					};

					const response = await supabaseRequest(
						`${ctx.targetUrl}/rest/v1/${table}`,
						ctx.anonKey,
						{
							method: 'POST',
							body: JSON.stringify(testData)
						}
					);

					if (response.ok || response.status === 201) {
						successful.push(table);
						// Try to clean up
						await supabaseRequest(
							`${ctx.targetUrl}/rest/v1/${table}?test_field=eq.${testData.test_field}`,
							ctx.serviceKey,
							{ method: 'DELETE' }
						);
					}
				} catch {
					// Continue
				}
			}

			const breached = successful.length > 0;

			return {
				attackId: 'rls-insert-bypass',
				status: breached ? 'breached' : 'secure',
				breached,
				summary: breached
					? `Successfully inserted data into ${successful.length} tables as anonymous`
					: 'INSERT operations properly restricted',
				details: {},
				evidence: breached ? { tables: successful } : undefined,
				timestamp: new Date().toISOString(),
				duration: 0
			};
		}
	},
	{
		id: 'rls-delete-bypass',
		name: 'Unauthorized DELETE',
		description: 'Attempts to delete data from tables without proper authorization',
		category: 'rls',
		severity: 'critical',
		tags: ['rls', 'delete', 'destructive'],
		execute: async (ctx: AttackContext): Promise<AttackResult> => {
			// Only check if DELETE is allowed, don't actually delete anything
			const tables = ['profiles', 'data', 'items'];
			const vulnerable: string[] = [];

			for (const table of tables) {
				try {
					// Use a non-existent ID to test permissions without deleting
					const response = await supabaseRequest(
						`${ctx.targetUrl}/rest/v1/${table}?id=eq.00000000-0000-0000-0000-000000000000`,
						ctx.anonKey,
						{
							method: 'DELETE',
							headers: {
								Prefer: 'return=minimal'
							}
						}
					);

					// If we get 200/204 instead of 401/403, DELETE might be allowed
					if (response.status === 200 || response.status === 204) {
						vulnerable.push(table);
					}
				} catch {
					// Continue
				}
			}

			const breached = vulnerable.length > 0;

			return {
				attackId: 'rls-delete-bypass',
				status: breached ? 'breached' : 'secure',
				breached,
				summary: breached
					? `DELETE operations allowed on ${vulnerable.length} tables for anonymous users`
					: 'DELETE operations properly restricted',
				details: {},
				evidence: breached ? { tables: vulnerable } : undefined,
				timestamp: new Date().toISOString(),
				duration: 0
			};
		}
	}
];
