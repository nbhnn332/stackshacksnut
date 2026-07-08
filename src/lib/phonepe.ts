import crypto from 'crypto';
import { Settings } from './mock-db';

/**
 * Clean credential string of invisible characters, zero-width spaces, and whitespace
 */
function cleanCredential(val: string | undefined): string {
  if (!val) return '';
  return val.replace(/[\u200B-\u200D\uFEFF\r\n\t]/g, '').trim();
}

/**
 * Get OAuth 2.0 Access Token from PhonePe Identity Manager / Sandbox (PG V2)
 */
export async function getPhonePeAccessToken(settings: Settings): Promise<string> {
  if (!settings.phonepeClientId || !settings.phonepeClientSecret) {
    throw new Error('PhonePe Client ID and Client Secret are required in settings');
  }

  const clientId = cleanCredential(settings.phonepeClientId);
  const clientSecret = cleanCredential(settings.phonepeClientSecret);
  const clientVersion = cleanCredential(settings.phonepeClientVersion || '1') || '1';

  const isProd = settings.phonepeEnvironment === 'production';
  const tokenUrl = isProd
    ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';

  console.log('[PhonePe Auth Audit] Authentication URL:', tokenUrl);
  console.log('[PhonePe Auth Audit] Environment:', settings.phonepeEnvironment || 'sandbox');
  console.log('[PhonePe Auth Audit] Client Version:', clientVersion);
  console.log('[PhonePe Auth Audit] First 6 characters of Client ID:', clientId.slice(0, 6));
  console.log('[PhonePe Auth Audit] Client Secret length only:', clientSecret.length);
  console.log('[PhonePe Auth Audit] Request headers:', { 'Content-Type': 'application/x-www-form-urlencoded' });

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_version', clientVersion);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'client_credentials');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const responseText = await response.text();
  console.log('[PhonePe Auth Audit] HTTP Status:', response.status);
  console.log('[PhonePe Auth Audit] Complete PhonePe response body:', responseText);

  if (!response.ok) {
    console.error(`[PhonePe Auth Audit] Authentication failed with status ${response.status}:`, responseText);
    throw new Error(`PhonePe authentication failed (${response.status}): ${responseText}`);
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`PhonePe authentication returned invalid JSON: ${responseText}`);
  }

  if (!data.access_token) {
    throw new Error(`PhonePe OAuth response missing access_token: ${responseText}`);
  }

  return data.access_token;
}

/**
 * Initiate Payment Order via PhonePe PG Checkout V2 API
 */
export async function createPhonePeOrder(
  amount: number,
  orderId: string,
  settings: Settings,
  redirectUrl: string,
  callbackUrl: string,
  customerPhone?: string,
  customerEmail?: string
): Promise<string> {
  if (!settings.phonepeClientId || !settings.phonepeClientSecret) {
    throw new Error('PhonePe configuration is missing in settings');
  }

  const accessToken = await getPhonePeAccessToken(settings);

  const isProd = settings.phonepeEnvironment === 'production';
  const baseUrl = isProd
    ? 'https://api.phonepe.com/apis/pg/checkout/v2'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2';

  const payload: any = {
    merchantOrderId: orderId,
    amount: Math.round(amount * 100), // amount in paise
    expireAfter: 1200, // 20 minutes expiration for QR code and checkout session
    paymentFlow: {
      type: 'PG_CHECKOUT',
      message: `Stack Shack Order ${orderId}`,
      merchantUrls: {
        redirectUrl: redirectUrl
      }
    }
  };

  if (customerPhone || customerEmail) {
    payload.metaInfo = {
      udf1: orderId,
      ...(customerPhone ? { udf2: customerPhone } : {}),
      ...(customerEmail ? { udf3: customerEmail } : {})
    };
  }

  console.log('[PhonePe Pay Audit] Complete Payment Creation Request:', {
    url: `${baseUrl}/pay`,
    environment: settings.phonepeEnvironment,
    payload,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'O-Bearer [MASKED_TOKEN]'
    }
  });

  const response = await fetch(`${baseUrl}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `O-Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[PhonePe Pay Audit] Pay API HTTP Error:', {
      status: response.status,
      statusText: response.statusText,
      errorBody: errText
    });
    throw new Error(`PhonePe payment initiation failed: ${response.statusText} (${response.status}) - ${errText}`);
  }

  const responseData = await response.json();

  const transactionId =
    responseData.orderId ||
    responseData.data?.paymentInstrument?.pgTransactionId ||
    responseData.data?.transactionId ||
    responseData.transactionId ||
    responseData.data?.providerReferenceId ||
    'N/A';

  let checkoutToken =
    responseData.token ||
    responseData.data?.token ||
    responseData.data?.checkoutToken ||
    'N/A';

  if (checkoutToken === 'N/A' && responseData.redirectUrl) {
    const match = responseData.redirectUrl.match(/token=([^&]+)/);
    if (match) checkoutToken = match[1];
  }

  console.log('[PhonePe Pay Audit] Complete PhonePe Response:', JSON.stringify(responseData, null, 2));
  console.log('[PhonePe Pay Audit] Audit Verification Summary:', {
    merchantOrderId: orderId,
    transactionId,
    paymentSessionData: responseData.data || responseData,
    checkoutToken,
    qrGenerationResponse: responseData.data?.qrInfo || responseData.data?.instrumentResponse || 'Managed via Hosted Checkout web session',
    availablePaymentInstruments: responseData.data?.paymentInstruments || ['DYNAMIC_QR', 'UPI_INTENT', 'DEBIT_CARD', 'CREDIT_CARD', 'NET_BANKING', 'WALLET'],
    phonePeErrorCode: responseData.code || 'NONE',
    hiddenError: responseData.message || responseData.error || 'NONE'
  });

  const redirectUrlResult = responseData.redirectUrl
    || responseData.data?.redirectUrl
    || responseData.data?.instrumentResponse?.redirectInfo?.url
    || responseData.paymentUrl
    || responseData.data?.paymentUrl;

  if (redirectUrlResult) {
    return redirectUrlResult;
  } else {
    throw new Error(`PhonePe returned failure or missing redirectUrl: ${responseData.message || JSON.stringify(responseData)}`);
  }
}

/**
 * Check Order Status via PhonePe PG Checkout V2 API
 */
export async function checkPhonePeOrderStatus(merchantOrderId: string, settings: Settings) {
  const accessToken = await getPhonePeAccessToken(settings);

  const isProd = settings.phonepeEnvironment === 'production';
  const baseUrl = isProd
    ? 'https://api.phonepe.com/apis/pg/checkout/v2'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2';

  const statusUrl = `${baseUrl}/order/${encodeURIComponent(merchantOrderId)}/status`;
  console.log('[PhonePe Status Audit] Checking Status:', { statusUrl, merchantOrderId });

  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `O-Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[PhonePe Status Audit] API Error:', response.status, errText);
    throw new Error(`PhonePe status check failed: ${response.statusText} (${response.status})`);
  }

  const responseData = await response.json();
  console.log('[PhonePe Status Audit] Response:', JSON.stringify(responseData));
  return responseData;
}

/**
 * Verify Webhook Authorization Header (SHA256(username:password))
 */
export function verifyPhonePeWebhookAuth(
  authHeader: string | null,
  username?: string | null,
  password?: string | null
): boolean {
  if (!authHeader) return false;
  if (!username || !password) return false;

  const expectedHash = crypto
    .createHash('sha256')
    .update(`${username}:${password}`)
    .digest('hex');

  return authHeader === `SHA256(${username}:${password})` || authHeader === expectedHash;
}
