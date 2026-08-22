/**
 * ApeAI — Payload & Signature Validation Engine (Layer 1)
 *
 * Validates inbound payloads for:
 *   - Required fields (content, author, source)
 *   - Content size limits (max 50,000 characters)
 *   - HMAC signature verification for inbound webhooks
 *
 * Webhook signature verification is enforced by default.
 * Set DEBUG_SKIP_SIGNATURE=true in .env to bypass during local development.
 */

import crypto from 'crypto';

// ─── Validation Result ────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Constants ────────────────────────────────────────────────

const MAX_CONTENT_LENGTH = 50_000;

// ─── Required Field Validation ────────────────────────────────

export function validateRequiredFields(
  payload: Record<string, unknown>,
  requiredFields: string[] = ['content'],
): ValidationResult {
  const errors: string[] = [];

  for (const field of requiredFields) {
    const value = payload[field];
    if (value === undefined || value === null) {
      errors.push(`Missing required field: '${field}'`);
    } else if (typeof value === 'string' && value.trim().length === 0) {
      errors.push(`Field '${field}' must not be empty`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Content Size Validation ──────────────────────────────────

export function validateContentSize(
  content: string,
  maxLength: number = MAX_CONTENT_LENGTH,
): ValidationResult {
  const errors: string[] = [];

  if (typeof content !== 'string') {
    errors.push(`'content' must be a string`);
    return { valid: false, errors };
  }

  if (content.length > maxLength) {
    errors.push(
      `'content' exceeds maximum length of ${maxLength} characters (got ${content.length})`,
    );
  }

  return { valid: errors.length === 0, errors };
}

// ─── Full Payload Validation ──────────────────────────────────

export function validateIngestionPayload(
  payload: Record<string, unknown>,
  requiredFields: string[] = ['content'],
): ValidationResult {
  const allErrors: string[] = [];

  // Check required fields
  const fieldResult = validateRequiredFields(payload, requiredFields);
  allErrors.push(...fieldResult.errors);

  // Check content size if content exists
  if (typeof payload['content'] === 'string') {
    const sizeResult = validateContentSize(payload['content'] as string);
    allErrors.push(...sizeResult.errors);
  }

  return { valid: allErrors.length === 0, errors: allErrors };
}

// ─── HMAC Signature Verification ──────────────────────────────

/**
 * Verifies an HMAC-SHA256 signature against a raw request body.
 * Used for validating inbound webhooks from Sentry, Intercom, etc.
 *
 * @param rawBody - The raw request body (Buffer or string)
 * @param signature - The signature from the request header
 * @param secret - The shared webhook secret
 * @param prefix - Optional prefix to strip from signature (e.g., 'sha256=')
 * @returns true if the signature is valid
 */
export function verifyHmacSignature(
  rawBody: Buffer | string,
  signature: string,
  secret: string,
  prefix: string = 'sha256=',
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const signatureValue = signature.startsWith(prefix)
    ? signature.slice(prefix.length)
    : signature;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signatureValue, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// ─── Webhook Validation Middleware Helper ─────────────────────

/**
 * Checks if webhook signature verification should be enforced.
 * Returns true if signatures should be verified (production default).
 * Returns false if DEBUG_SKIP_SIGNATURE=true is set in env.
 */
export function shouldVerifySignatures(): boolean {
  return process.env.DEBUG_SKIP_SIGNATURE !== 'true';
}

/**
 * Validates a webhook payload with optional signature verification.
 * Combines field validation + signature check into a single call.
 */
export function validateWebhookPayload(
  payload: Record<string, unknown>,
  options: {
    requiredFields?: string[];
    rawBody?: Buffer | string;
    signature?: string;
    secret?: string;
    signaturePrefix?: string;
  } = {},
): ValidationResult {
  const allErrors: string[] = [];

  // Validate required fields and content size
  const payloadResult = validateIngestionPayload(
    payload,
    options.requiredFields ?? ['content'],
  );
  allErrors.push(...payloadResult.errors);

  // Verify HMAC signature if applicable
  if (shouldVerifySignatures() && options.secret) {
    if (!options.rawBody || !options.signature) {
      allErrors.push('Missing webhook signature for verification');
    } else {
      const isValid = verifyHmacSignature(
        options.rawBody,
        options.signature,
        options.secret,
        options.signaturePrefix ?? 'sha256=',
      );
      if (!isValid) {
        allErrors.push('Invalid webhook signature');
      }
    }
  }

  return { valid: allErrors.length === 0, errors: allErrors };
}
