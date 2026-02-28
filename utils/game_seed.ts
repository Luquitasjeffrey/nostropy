import crypto from 'crypto';

export interface ServerSeed {
  seed: string;
  hash: string;
}

export function generateServerSeed(): ServerSeed {
  const seed = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(seed).digest('hex');

  return {
    seed,
    hash,
  };
}

export function generateGameSeed(clientSeed: string, serverSeed: string) {
  const combined = `${clientSeed}:${serverSeed}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * GameSeed - Deterministic Pseudo-Random Number Generator
 *
 * Uses SHA256 to generate a chain of deterministic random values
 * from an initial seed. This ensures fair randomness that can be
 * verified by the player using the same seed.
 *
 * Seed must be a 64-character hexadecimal string (32 bytes / 256 bits).
 */
export class GameSeed {
  private seed: string;
  private nonce: bigint = 0n;

  constructor(seed: string) {
    // Validate seed format: 64 hex characters = 32 bytes
    if (!/^[a-f0-9]{64}$/i.test(seed)) {
      throw new Error('Seed must be a 64-character hexadecimal string (32 bytes)');
    }
    this.seed = seed;
  }

  /**
   * Generate next SHA256 hash using current seed and incrementing nonce.
   * Process:
   * 1. Concatenate current (as hex) + nonce (as hex)
   * 2. First SHA256 pass
   * 3. Second SHA256 pass on the result
   * 4. Increment nonce and return hash
   */
  private nextHash(): Buffer {
    const nonceHex = this.nonce.toString(16).padStart(64, '0');
    const combined = this.seed + nonceHex;

    // First SHA256 pass
    let hash = crypto.createHash('sha256').update(combined).digest();

    // Second SHA256 pass
    hash = crypto.createHash('sha256').update(hash).digest();

    this.nonce++;
    return hash;
  }

  /**
   * Generate next psudo random value as hex string (64 characters).
   * @returns string
   */
  private nextHashHex(): string {
    return this.nextHash().toString('hex');
  }

  /**
   * Generate next random 32-bit unsigned integer.
   */
  nextInt(): number {
    const hash = this.nextHash();
    // Read first 4 bytes as big-endian unsigned integer
    return hash.readUInt32BE(0);
  }

  /**
   * Generate next random value as 64-character hex string (256 bits / 32 bytes).
   */
  nextString(): string {
    const hash = this.nextHash();
    return hash.toString('hex');
  }

  /**
   * Generate next random BigInt in range [0, 2^256).
   * Uses a single SHA256 hash output (32 bytes = 256 bits).
   */
  nextBigInt(): bigint {
    const hash = this.nextHashHex();
    // Convert 32-byte buffer to BigInt (big-endian)
    return BigInt('0x' + hash);
  }

  /**
   * Fisher-Yates shuffle using this PRNG for deterministic reordering.
   * Returns a new shuffled copy of the input array.
   */
  shuffle<T>(input: T[]): T[] {
    const array = [...input];
    for (let i = array.length - 1; i > 0; i--) {
      // Use nextInt() modulo (i+1) to get random index in [0, i]

      const jBig = this.nextBigInt() % (BigInt(i) + 1n);
      const j = Number(jBig);
      // Swap elements
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
