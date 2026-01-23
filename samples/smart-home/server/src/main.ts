import express from 'express';
import cors from 'cors';
import { Chat } from '@hashbrownai/core';
import { HashbrownOpenAI } from '@hashbrownai/openai';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

const app = express();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] ${req.method} ${req.path}`);

  // Log request body for POST requests (excluding streaming responses)
  if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
    // Truncate large bodies for readability
    const bodyStr = JSON.stringify(req.body);
    const truncatedBody =
      bodyStr.length > 1000
        ? bodyStr.substring(0, 1000) + '... (truncated)'
        : bodyStr;
    console.log(`[${timestamp}] Request body:`, truncatedBody);
  }

  // Log response when it finishes
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any, cb?: any): express.Response {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
    );

    if (chunk && res.getHeader('Content-Type') !== 'application/octet-stream') {
      try {
        const responseStr = chunk?.toString() || '';
        const truncatedResponse =
          responseStr.length > 500
            ? responseStr.substring(0, 500) + '... (truncated)'
            : responseStr;
        console.log(`[${timestamp}] Response:`, truncatedResponse);
      } catch (e) {
        // Ignore errors when trying to log response
      }
    }

    return originalEnd(chunk, encoding, cb);
  };

  next();
});

app.post('/api/chat', async (req, res) => {
  const timestamp = new Date().toISOString();
  const completionParams = req.body as Chat.Api.CompletionCreateParams;

  console.log(`[${timestamp}] Starting chat stream...`);

  try {
    const response = HashbrownOpenAI.stream.text({
      apiKey: OPENAI_API_KEY,
      request: completionParams,
    });

    res.header('Content-Type', 'application/octet-stream');

    let chunkCount = 0;
    for await (const chunk of response) {
      res.write(chunk);
      chunkCount++;
    }

    const endTimestamp = new Date().toISOString();
    console.log(
      `[${endTimestamp}] Chat stream completed (${chunkCount} chunks)`,
    );
    res.end();
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] Chat stream error:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
