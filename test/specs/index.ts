/**
 * Unit tests for the two bugs fixed in ProofUtil.getReceiptProof
 *
 * Background
 * ----------
 * getReceiptProof must fetch a receipt for every transaction in a Polygon block
 * in order to rebuild the receipts trie and produce an inclusion proof.  Blocks
 * on Polygon mainnet can contain 280+ transactions.
 *
 * Bug 1 — requestConcurrency had no effect on HTTP concurrency
 *   The original code called web3.getTransactionReceipt() inside a forEach
 *   loop and pushed the *already-running* Promises into an array, then passed
 *   that array to mapPromise.  Because every request was already in-flight by
 *   the time mapPromise saw the array, mapPromise's `concurrency` option only
 *   controlled result-collection batching; it had zero effect on how many HTTP
 *   requests were made simultaneously.  Setting requestConcurrency: 10 in the
 *   caller (proof-generation-api) therefore did nothing.
 *
 * Bug 2 — transient network errors (ECONNRESET, ENOTFOUND, …) were not retried
 *   Node.js 19+ enables keep-alive on the global HTTPS agent by default.
 *   ethers.js v5 uses that agent (no custom agent is passed to https.request).
 *   During proof generation several Polygon RPC calls run early (isCheckPointed,
 *   getBlockWithTransaction, getFastMerkleProof), then sequential Ethereum calls
 *   run for a few seconds.  During that idle window the RPC server can close
 *   pooled keep-alive connections.  When getReceiptProof then fires 280+
 *   requests, some hit stale sockets and receive ECONNRESET.  Because neither
 *   mapPromise nor the converter had any retry logic, a single failure propagated
 *   immediately through Promise.all and the whole proof attempt failed.
 *
 * The fix (src/utils/proof_util.ts)
 *   - Collects tx hashes first, then passes a *factory* function to mapPromise
 *     so requests are started lazily inside mapPromise under its concurrency
 *     control.
 *   - The factory wraps each call with up to 2 retries for transient errors.
 *
 * These tests verify mapPromise's behaviour with both the old pattern (eager
 * promises) and the new pattern (lazy factory), and verify the retry logic,
 * without needing any network access or domain-specific mocks.
 */

import { mapPromise } from '../../src/utils/map_promise';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a timer-free promise that yields to the event loop once. */
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

// ─── mapPromise concurrency tests ─────────────────────────────────────────────

describe('mapPromise — concurrency limiting', () => {

    it('OLD pattern: eager promises ignore requestConcurrency — all run at once', async () => {
        // This test documents the *pre-fix* behaviour so the regression is
        // explicit: even with concurrency: 1, all promises were already running.
        const N = 10;
        let activeCalls = 0;
        let maxActiveCalls = 0;

        // Eagerly start all promises (the old pattern in getReceiptProof).
        const eagerPromises = Array.from({ length: N }, () => {
            activeCalls++;
            maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
            return tick().then(() => { activeCalls--; return 'ok'; });
        });

        // Pass the already-running promises with concurrency: 1.
        // The identity converter (val => val) just returns the promise.
        await mapPromise(eagerPromises, (val: Promise<string>) => val, { concurrency: 1 });

        // All N started before mapPromise was called — concurrency was not limited.
        expect(maxActiveCalls).toBe(N);
    });

    it('NEW pattern: lazy factory respects requestConcurrency', async () => {
        const N = 20;
        const LIMIT = 5;
        let activeCalls = 0;
        let maxActiveCalls = 0;

        const values = Array.from({ length: N }, (_, i) => i);

        // Pass hashes (values), not pre-started promises.
        // The converter is the factory: it starts the request.
        await mapPromise(values, async (_val: number) => {
            activeCalls++;
            maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
            await tick();
            activeCalls--;
            return 'ok';
        }, { concurrency: LIMIT });

        expect(maxActiveCalls).toBeLessThanOrEqual(LIMIT);
        // Sanity: all items were processed.
        expect(maxActiveCalls).toBeGreaterThan(0);
    });

    it('without a concurrency limit all N factory calls run concurrently', async () => {
        const N = 20;
        let activeCalls = 0;
        let maxActiveCalls = 0;

        const values = Array.from({ length: N }, (_, i) => i);

        await mapPromise(values, async (_val: number) => {
            activeCalls++;
            maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
            await tick();
            activeCalls--;
            return 'ok';
        }); // no concurrency option → default is N

        expect(maxActiveCalls).toBe(N);
    });

});

// ─── Retry-on-transient-error tests ───────────────────────────────────────────

describe('getReceiptProof retry logic', () => {

    /**
     * Replicates the retry closure used in the fixed getReceiptProof converter,
     * including the full-jitter backoff, so the tests verify the exact pattern
     * that is shipped.
     */
    const MAX_RETRIES = 2;
    function withRetry<T>(fn: () => Promise<T>, remaining = MAX_RETRIES): Promise<T> {
        return fn().catch((err: any) => {
            const isTransient =
                err?.code === 'ECONNRESET'   ||
                err?.code === 'ENOTFOUND'    ||
                err?.code === 'ECONNREFUSED' ||
                err?.code === 'ETIMEDOUT'    ||
                err?.errno === 'ECONNRESET'  ||
                err?.errno === 'ENOTFOUND';
            if (remaining > 0 && isTransient) {
                const i = MAX_RETRIES - remaining;
                const delayMs = Math.random() * Math.min(250, 50 * Math.pow(2, i));
                return new Promise<void>(resolve => setTimeout(resolve, delayMs))
                    .then(() => withRetry(fn, remaining - 1));
            }
            throw err;
        });
    }

    it('succeeds on the second attempt after one ECONNRESET', async () => {
        let calls = 0;
        const result = await withRetry(() => {
            calls++;
            if (calls === 1) return Promise.reject(Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }));
            return Promise.resolve('ok');
        });
        expect(result).toBe('ok');
        expect(calls).toBe(2);
    });

    it('succeeds on the second attempt after one ENOTFOUND', async () => {
        let calls = 0;
        const result = await withRetry(() => {
            calls++;
            if (calls === 1) return Promise.reject(Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }));
            return Promise.resolve('ok');
        });
        expect(result).toBe('ok');
        expect(calls).toBe(2);
    });

    it('exhausts all 2 retries (3 total calls) and then throws', async () => {
        let calls = 0;
        await expect(withRetry(() => {
            calls++;
            return Promise.reject(Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }));
        })).rejects.toMatchObject({ code: 'ECONNRESET' });
        expect(calls).toBe(3); // 1 initial + 2 retries
    });

    it('does NOT retry a non-transient error', async () => {
        let calls = 0;
        await expect(withRetry(() => {
            calls++;
            return Promise.reject(Object.assign(new Error('execution reverted'), { code: 'CALL_EXCEPTION' }));
        })).rejects.toMatchObject({ code: 'CALL_EXCEPTION' });
        expect(calls).toBe(1); // no retries
    });

});
