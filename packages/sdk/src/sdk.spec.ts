import { describe, expect, it } from 'vitest';

import {
  createGovernanceClient,
  createGovernanceTokenClient,
} from './contracts/governance.js';

describe('GovernanceTokenClient', () => {
  const client = createGovernanceTokenClient('CGOVERNANCETOKENDUMMYADDRESSAAAAAAAAAAAAAAA');

  it('returns zero total supply for a fresh token', async () => {
    const supply = await client.totalSupply();
    expect(supply).toBe(0n);
  });

  it('returns zero balance for unknown address', async () => {
    const balance = await client.balanceOf('GDUMMYADDRESS');
    expect(balance).toBe(0n);
  });

  it('returns zero current votes for unknown address', async () => {
    const votes = await client.getCurrentVotes('GDUMMYADDRESS');
    expect(votes).toBe(0n);
  });

  it('returns zero past votes for unknown address', async () => {
    const votes = await client.getPastVotes('GDUMMYADDRESS', 100);
    expect(votes).toBe(0n);
  });

  it('delegate returns the contract id', async () => {
    const result = await client.delegate('GDUMMYADDRESS', 'GOTHERADDRESS');
    expect(result).toBe('CGOVERNANCETOKENDUMMYADDRESSAAAAAAAAAAAAAAA');
  });
});

describe('GovernanceClient', () => {
  const client = createGovernanceClient('CGOVERNANCEDUMMYADDRESSAAAAAAAAAAAAAAAAAAAA');

  it('returns zero proposal count initially', async () => {
    const count = await client.proposalCount();
    expect(count).toBe(0);
  });

  it('returns config with expected defaults', async () => {
    const config = await client.config();
    expect(config.votingPeriod).toBe(40320);
    expect(config.votingDelay).toBe(7200);
    expect(config.proposalThreshold).toBeGreaterThan(0n);
    expect(config.quorumNumerator).toBe(4);
    expect(config.quorumDenominator).toBe(100);
  });

  it('propose returns a proposal id', async () => {
    const id = await client.propose('GPROPOSER', 'Test proposal', []);
    expect(id).toBe(0);
  });

  it('getProposal throws for unknown proposal', async () => {
    await expect(client.getProposal(999)).rejects.toThrow('Proposal not found');
  });

  it('hasVoted returns false for new voter', async () => {
    const voted = await client.hasVoted(0, 'GVOTER');
    expect(voted).toBe(false);
  });

  it('castVote returns contract id', async () => {
    const result = await client.castVote('GVOTER', 0, 'for');
    expect(result).toBe('CGOVERNANCEDUMMYADDRESSAAAAAAAAAAAAAAAAAAAA');
  });

  it('queue returns eta of 0', async () => {
    const eta = await client.queue(0);
    expect(eta).toBe(0);
  });
});
