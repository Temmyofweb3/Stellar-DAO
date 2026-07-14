import { describe, expect, it } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { secp256k1 } from '@noble/curves/secp256k1';

import { buildLockDigest, signSecp256k1, verifySecp256k1 } from '@stellardao/sdk';
import { eventQueue } from './state/event-queue.js';

describe('buildLockDigest + sign + verify (round-trip)', () => {
  it('produces a 32-byte hash and a cryptographically valid signature', async () => {
    // Use a real G-address from a randomly-generated keypair so future
    // SDK bumps that add Address validation upstream of the digest
    // builder don't silently break this assertion.
    const recipientKp = Keypair.random();
    // Generate a real secp256k1 private key from the noble library so
    // the signature produced is cryptographically valid. The previous
    // test used `'99'.repeat(32)` which is OUT OF RANGE for secp256k1
    // (greater than the curve order n). The test passed only because
    // it asserted `sig.length === 64`, which holds even for an invalid
    // key. The `verifySecp256k1` round-trip below catches that class
    // of bug: a real signature verifies, a garbage-length one doesn't.
    const privKey = secp256k1.utils.randomPrivateKey();
    const testPrivKey = '0x' + Buffer.from(privKey).toString('hex');

    const digest = buildLockDigest({
      sourceChain: 'ethereum',
      sourceToken: '0xab',
      // `wrapperToken` is hex-encoded in the digest; pass a string and
      // let `buildLockDigest` decode it internally.
      wrapperToken: 'ab'.repeat(32),
      recipient: recipientKp.publicKey(),
      amount: '500',
      nonce: new Uint8Array(32).fill(7),
    });
    expect(digest.length).toBe(32);

    const sig = await signSecp256k1(digest, testPrivKey);
    expect(sig.length).toBe(64);

    // Round-trip: derive the public key from the private key and verify
    // the signature against it. Without this, an out-of-range key (or
    // any other producer bug) would silently produce a 64-byte
    // garbage buffer that fails at the bridge verifier, not in tests.
    const pubKey = secp256k1.getPublicKey(privKey, true); // compressed (33 bytes)
    const isValid = await verifySecp256k1(digest, pubKey, sig);
    expect(isValid).toBe(true);
  });
});

describe('eventQueue', () => {
  it('round-trips a transaction', () => {
    // Use a real G-address for the recipient so the test stays valid
    // even if downstream code starts validating strkey checksums
    // before storing the transaction.
    const recipientKp = Keypair.random();
    const tx = eventQueue.push({
      id: 'ethereum:abc',
      type: 'wrap',
      sourceChain: 'ethereum',
      sourceToken: '0xab',
      wrapperToken: 'CABC',
      recipient: recipientKp.publicKey(),
      amount: '1000',
      status: 'pending',
      sourceTxHash: '0x123',
      stellarTxHash: null,
      nonce: 'abc',
    });
    expect(tx.id).toBe('ethereum:abc');
    expect(eventQueue.list().length).toBe(1);
  });
});
