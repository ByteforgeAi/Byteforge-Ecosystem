/**
 * RSASSA-PKCS1-v1_5 signing engine with async initialization,
 * key export/import helpers, and safe base64 utilities
 */
export type HashAlg = "SHA-256" | "SHA-384" | "SHA-512"

export interface SigningEngineOptions {
  modulusLength?: number
  publicExponent?: Uint8Array
  hash?: HashAlg
}

export interface JwkKeypair {
  publicKeyJwk: JsonWebKey
  privateKeyJwk?: JsonWebKey
}

function hasBuffer(): boolean {
  return typeof Buffer !== "undefined" && typeof Buffer.from === "function"
}

function toBase64(bytes: ArrayBuffer): string {
  if (hasBuffer()) {
    return Buffer.from(bytes).toString("base64")
  }
  let binary = ""
  const arr = new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
  // btoa is available in browsers
  // eslint-disable-next-line no-undef
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  if (hasBuffer()) {
    return new Uint8Array(Buffer.from(b64, "base64"))
  }
  // eslint-disable-next-line no-undef
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function textEncode(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

export class SigningEngine {
  private keyPair!: CryptoKeyPair
  private readonly algorithm: RsaHashedKeyGenParams

  private constructor(algorithm: RsaHashedKeyGenParams) {
    this.algorithm = algorithm
  }

  /**
   * Factory: create a new engine and generate a fresh RSA keypair
   */
  static async create(opts: SigningEngineOptions = {}): Promise<SigningEngine> {
    const algo: RsaHashedKeyGenParams = {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: opts.modulusLength ?? 2048,
      publicExponent: opts.publicExponent ?? new Uint8Array([1, 0, 1]),
      hash: opts.hash ?? "SHA-256",
    }

    const engine = new SigningEngine(algo)
    await engine.generate()
    return engine
  }

  /**
   * Factory: create engine from existing JWK keypair (public required, private optional)
   */
  static async fromJwk(jwk: JwkKeypair, opts: SigningEngineOptions = {}): Promise<SigningEngine> {
    const algo: RsaHashedImportParams = {
      name: "RSASSA-PKCS1-v1_5",
      hash: opts.hash ?? "SHA-256",
    }
    const engine = new SigningEngine({
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: opts.modulusLength ?? 2048,
      publicExponent: opts.publicExponent ?? new Uint8Array([1, 0, 1]),
      hash: opts.hash ?? "SHA-256",
    })

    const subtle = crypto.subtle
    const publicKey = await subtle.importKey(
      "jwk",
      jwk.publicKeyJwk,
      algo,
      true,
      ["verify"]
    )

    let privateKey: CryptoKey | undefined
    if (jwk.privateKeyJwk) {
      privateKey = await subtle.importKey("jwk", jwk.privateKeyJwk, algo, true, ["sign"])
    }

    engine.keyPair = {
      publicKey,
      // @ts-expect-error allow undefined private when only verifying
      privateKey,
    }
    return engine
  }

  /**
   * Generate a fresh keypair
   */
  private async generate(): Promise<void> {
    const subtle = crypto.subtle
    this.keyPair = await subtle.generateKey(this.algorithm, true, ["sign", "verify"])
  }

  /**
   * Sign arbitrary string payload, returning base64 signature
   */
  async sign(data: string): Promise<string> {
    if (!this.keyPair?.privateKey) {
      throw new Error("Private key is not available for signing")
    }
    const sig = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      this.keyPair.privateKey,
      textEncode(data)
    )
    return toBase64(sig)
  }

  /**
   * Verify base64 signature against the given string payload
   */
  async verify(data: string, signatureB64: string): Promise<boolean> {
    const sig = fromBase64(signatureB64)
    return crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      this.keyPair.publicKey,
      sig,
      textEncode(data)
    )
  }

  /**
   * Export public key in JWK format
   */
  async exportPublicKeyJwk(): Promise<JsonWebKey> {
    return crypto.subtle.exportKey("jwk", this.keyPair.publicKey)
  }

  /**
   * Export private key in JWK format (if present)
   */
  async exportPrivateKeyJwk(): Promise<JsonWebKey> {
    if (!this.keyPair.privateKey) throw new Error("Private key is not available")
    return crypto.subtle.exportKey("jwk", this.keyPair.privateKey)
  }

  /**
   * Returns a compact reference string for logging/debugging
   */
  async fingerprint(): Promise<string> {
    const jwk = await this.exportPublicKeyJwk()
    // Create a stable fingerprint from modulus and exponent
    const n = jwk.n ?? ""
    const e = jwk.e ?? ""
    const data = `${n}.${e}`
    const digest = await crypto.subtle.digest("SHA-256", textEncode(data))
    return toBase64(digest).slice(0, 16)
  }
}
