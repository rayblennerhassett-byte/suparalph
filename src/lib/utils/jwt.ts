/**
 * Safe JWT parsing utilities
 *
 * Wraps the error-prone JSON.parse(atob(...)) pattern used across
 * attack modules so that malformed tokens produce null instead of
 * throwing uncaught exceptions.
 */

export interface JWTParts {
	header: Record<string, unknown>;
	payload: Record<string, unknown>;
}

/** Decode a single base64url/base64 JWT segment and parse as JSON. */
function decodeSegment(segment: string): Record<string, unknown> | null {
	try {
		// JWT uses base64url; atob() expects standard base64
		const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
		return JSON.parse(atob(base64));
	} catch {
		return null;
	}
}

/**
 * Safely parse a JWT token string into its header and payload objects.
 * Returns null if the token is not a valid three-part JWT or if any
 * segment fails to decode.
 */
export function parseJWT(token: string): JWTParts | null {
	const parts = token.split('.');
	if (parts.length !== 3) return null;

	const header = decodeSegment(parts[0]);
	const payload = decodeSegment(parts[1]);

	if (!header || !payload) return null;
	return { header, payload };
}

/**
 * Safely parse only the payload (claims) of a JWT token.
 * Returns null if the token is malformed.
 */
export function parseJWTPayload(token: string): Record<string, unknown> | null {
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	return decodeSegment(parts[1]);
}
