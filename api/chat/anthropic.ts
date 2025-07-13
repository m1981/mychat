
import { NextApiRequest, NextApiResponse } from 'next';
import { AnthropicClientAdapter } from '@api/clients/anthropic-client';
import { FormattedRequest } from '@type/provider';
import { formatStreamingChunk } from '@api/utils/response-formatter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.debug('[AnthropicAPI] Received request with body structure:', 
      JSON.stringify({
        hasFormattedRequest: !!req.body.formattedRequest,
        hasDirectModel: !!req.body.model,
        hasApiKey: !!req.body.apiKey || !!(req.body.formattedRequest && req.body.apiKey)
      }));
    
    // Extract request data - handle both direct and nested formats
    let formattedRequest: FormattedRequest;
    let apiKey: string;
    
    if (req.body.formattedRequest) {
      // Nested format (from frontend)
      formattedRequest = req.body.formattedRequest;
      apiKey = req.body.apiKey;
      console.debug('[AnthropicAPI] Using nested formattedRequest format');
    } else {
      // Direct format (from tests or other sources)
      const { apiKey: extractedApiKey, ...requestParams } = req.body;
      formattedRequest = requestParams;
      apiKey = extractedApiKey;
      console.debug('[AnthropicAPI] Using direct parameters format, converted to formattedRequest');
    }
    
    console.debug('[AnthropicAPI] Request details:', 
      JSON.stringify({
        model: formattedRequest.model,
        streaming: !!formattedRequest.stream,
        messageCount: formattedRequest.messages?.length,
        hasApiKey: !!apiKey,
        hasSystemInMessages: formattedRequest.messages?.some(m => m.role === 'system'),
        hasSystemProperty: !!formattedRequest.system
      }));
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (!formattedRequest) {
      return res.status(400).json({ error: 'Formatted request is required' });
    }
    
    // Generate a request ID for tracking
    const requestId = Date.now().toString(36);
    console.info(`[INFO] Processing anthropic request with ID: ${requestId}`);
    
    // Create client adapter
    console.debug('[AnthropicAPI] Creating client for anthropic');
    const client = new AnthropicClientAdapter(apiKey, requestId);
    
    if (formattedRequest.stream) {
      // Handle streaming response
      console.info('[INFO] Starting streaming response for anthropic');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Keep connection alive with ping
      const keepAliveInterval = setInterval(() => {
        res.write('event: ping\ndata: {}\n\n');
      }, 15000);
      
      try {
        console.debug('[AnthropicAPI] Creating streaming completion for anthropic');
        const stream = await client.createStreamingCompletion(formattedRequest);
        
        // Process stream
        console.debug('[AnthropicAPI] Processing stream for anthropic');
        let chunkCount = 0;

        for await (const chunk of stream) {
          chunkCount++;
          // Log the raw chunk structure to help debug
          if (chunkCount === 1 || chunkCount === 2 || chunkCount === 3) {
            console.debug(`[AnthropicAPI] Chunk ${chunkCount} structure:`, 
              JSON.stringify({
                type: chunk.type,
                hasContentBlock: !!chunk.content_block,
                hasDelta: !!chunk.delta,
                keys: Object.keys(chunk),
                rawChunk: chunk
              }));
          }
          
          const formattedChunk = formatStreamingChunk(chunk, 'anthropic');
          console.debug(`[AnthropicAPI] Formatted chunk ${chunkCount}:`, JSON.stringify(formattedChunk));
          res.write(`data: ${JSON.stringify(formattedChunk)}\n\n`);
        }
        
        console.info(`[INFO] Streaming completed for anthropic, sent ${chunkCount} chunks`);
      } catch (error) {
        console.error('[AnthropicAPI] Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      } finally {
        clearInterval(keepAliveInterval);
        res.write('data: [DONE]\n\n');
        res.end();
        console.info('[INFO] Closed stream connection for anthropic');
      }
    } else {
      // Handle non-streaming response
      console.info('[INFO] Creating non-streaming completion for anthropic');
      const response = await client.createCompletion(formattedRequest);

      console.debug('[AnthropicAPI] Received response from anthropic:', 
        JSON.stringify({
          responseId: response.id,
          model: response.model,
          choicesCount: response.choices?.length,
          content: response.choices?.[0]?.message?.content?.substring(0, 50),
          usage: response.usage
        }));

      return res.status(200).json(response);
    }
  } catch (error: any) {
    console.error('[AnthropicAPI] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}