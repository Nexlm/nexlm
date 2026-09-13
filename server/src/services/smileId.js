import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { randomToken } from '../lib/crypto.js';
import { serviceUnavailable } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

const BASE_URLS = {
  sandbox: 'https://testapi.smileidentity.com/v1',
  production: 'https://api.smileidentity.com/v1',
};

const ID_TYPES = { BVN: 'BVN', NIN: 'NIN_V2' };

export const isSmileConfigured = () => Boolean(env.SMILE_PARTNER_ID && env.SMILE_API_KEY);

function sign(timestamp) {
  return crypto
    .createHmac('sha256', env.SMILE_API_KEY)
    .update(timestamp, 'utf8')
    .update(env.SMILE_PARTNER_ID, 'utf8')
    .update('sid_request', 'utf8')
    .digest('base64');
}

/**
 * Basic KYC lookup against the NIBSS (BVN) or NIMC (NIN) database via Smile ID.
 * Returns whether the ID exists and the submitted names match the record.
 */
export async function verifyNigerianId({ userId, idType, idNumber, firstName, lastName, dateOfBirth }) {
  const timestamp = new Date().toISOString();
  const jobId = `nexlm-${randomToken(8)}`;

  let response;
  try {
    response = await fetch(`${BASE_URLS[env.SMILE_ENV]}/id_verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_sdk: 'rest_api',
        source_sdk_version: '1.0.0',
        partner_id: env.SMILE_PARTNER_ID,
        timestamp,
        signature: sign(timestamp),
        country: 'NG',
        id_type: ID_TYPES[idType],
        id_number: idNumber,
        first_name: firstName,
        last_name: lastName,
        dob: dateOfBirth,
        partner_params: { job_id: jobId, user_id: userId, job_type: 5 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    logger.error('Smile ID request failed', { err });
    throw serviceUnavailable('Identity verification is temporarily unavailable', 'KYC_PROVIDER_ERROR');
  }

  if (!response.ok) {
    logger.error('Smile ID returned an error', { status: response.status });
    throw serviceUnavailable('Identity verification is temporarily unavailable', 'KYC_PROVIDER_ERROR');
  }

  const body = await response.json();
  const actions = body.Actions ?? {};
  const idValid = actions.Verify_ID_Number === 'Verified';
  const namesMatch = ['Exact Match', 'Partial Match'].includes(actions.Names);

  return {
    jobId,
    verified: idValid && namesMatch,
    resultCode: body.ResultCode,
    resultText: body.ResultText,
  };
}
