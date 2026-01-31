/**
 * Centralized scan configuration constants
 *
 * All timeout, concurrency, and delay values used across the scan engine
 * are defined here to avoid magic numbers scattered throughout the codebase.
 */

/** Timeout values in milliseconds */
export const SCAN_TIMEOUTS = {
	/** Default attack timeout used by the breach engine */
	DEFAULT_ATTACK: 30_000,
	/** Attack timeout for browser-side (client) scans */
	BROWSER_ATTACK: 10_000,
	/** Attack timeout for server-side POST scans */
	SERVER_ATTACK: 15_000,
	/** Attack timeout for server-side SSE streaming scans (gentler) */
	SERVER_SSE_ATTACK: 8_000,
	/** URL reachability check before starting a scan */
	URL_REACHABILITY: 5_000,
	/** SSE heartbeat interval to prevent proxy timeouts */
	SSE_HEARTBEAT: 15_000
} as const;

/** Concurrency limits for parallel attack execution */
export const SCAN_CONCURRENCY = {
	/** Default concurrent attacks */
	DEFAULT: 3,
	/** Server-side POST endpoint (higher throughput) */
	SERVER: 5,
	/** Server-side SSE streaming (gentler on target) */
	SERVER_SSE: 3,
	/** Browser-side scans */
	BROWSER: 3
} as const;

/** Delay between consecutive attacks in milliseconds */
export const SCAN_DELAYS = {
	/** Default delay between attacks */
	DEFAULT: 100,
	/** Browser-side scan delay */
	BROWSER: 50,
	/** Server-side scan delay */
	SERVER: 50,
	/** Server-side SSE scan delay */
	SERVER_SSE: 50
} as const;
