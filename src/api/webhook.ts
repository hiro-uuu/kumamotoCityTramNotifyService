import { WebhookEvent, validateSignature } from '@line/bot-sdk';
import { getChannelSecret } from '../services/line-client.js';
import { handleFollow, handleUnfollow, handleMessage, handlePostback } from '../handlers/index.js';

export interface WebhookRequest {
  body: string;
  headers: {
    'x-line-signature'?: string;
  };
}

export interface WebhookResponse {
  statusCode: number;
  body: string;
}

/**
 * Verify LINE webhook signature
 */
function verifySignature(body: string, signature: string): boolean {
  try {
    const channelSecret = getChannelSecret();
    return validateSignature(body, channelSecret, signature);
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Process a single webhook event
 */
async function processEvent(event: WebhookEvent): Promise<void> {
  console.log(`Processing event: ${event.type}`);

  switch (event.type) {
    case 'follow':
      await handleFollow(event);
      break;

    case 'unfollow':
      if (event.source.userId) {
        await handleUnfollow(event.source.userId);
      }
      break;

    case 'message':
      await handleMessage(event);
      break;

    case 'postback':
      await handlePostback(event);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

/**
 * Main webhook handler
 */
export async function handleWebhook(req: WebhookRequest): Promise<WebhookResponse> {
  // Verify signature
  const signature = req.headers['x-line-signature'];
  if (!signature) {
    console.error('Missing signature');
    return { statusCode: 401, body: 'Missing signature' };
  }

  if (!verifySignature(req.body, signature)) {
    console.error('Invalid signature');
    return { statusCode: 401, body: 'Invalid signature' };
  }

  // Parse events
  let events: WebhookEvent[];
  try {
    const body = JSON.parse(req.body);
    events = body.events || [];
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return { statusCode: 400, body: 'Invalid request body' };
  }

  // Process events (don't await to return quickly)
  Promise.all(events.map(processEvent)).catch((error) => {
    console.error('Error processing events:', error);
  });

  return { statusCode: 200, body: 'OK' };
}

/**
 * Vercel serverless function handler
 */
export default async function handler(
  req: { body: unknown; headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { send: (body: string) => void } }
): Promise<void> {
  if (!req.body) {
    res.status(400).send('Missing body');
    return;
  }

  // Convert body to string
  const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  const webhookReq: WebhookRequest = {
    body: bodyStr,
    headers: {
      'x-line-signature': req.headers['x-line-signature'] as string | undefined,
    },
  };

  const result = await handleWebhook(webhookReq);
  res.status(result.statusCode).send(result.body);
}
