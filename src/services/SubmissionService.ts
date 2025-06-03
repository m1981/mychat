import useStore from '@store/store';
import { MessageInterface, ModelConfig } from '@type/chat';
import { providers } from '@type/providers';
import { debug } from '@utils/debug';

export interface SubmissionService {
  submit(messages: MessageInterface[], config: ModelConfig): Promise<void>;
}

export class ChatSubmissionService implements SubmissionService {
  constructor(
    private provider: typeof providers[keyof typeof providers],
    private apiKey: string,
    private contentCallback: (content: string) => void,
    private streamHandler: {
      processStream: (reader: ReadableStreamDefaultReader<Uint8Array>, callback: (content: string) => void) => Promise<void>
    }
  ) {
    // Add validation for API key
    if (!this.apiKey) {
      console.error('⚠️ No API key provided for provider:', provider);
    }
  }

  async submit(messages: MessageInterface[], modelConfig: ModelConfig): Promise<void> {
    debug.log('useSubmit', 'Submitting with API key:', this.apiKey ? 'Key exists' : 'Key missing');
    
    if (!this.apiKey) {
      throw new Error('API key is missing. Please add your API key in settings.');
    }
    
    // Format the request
    const formattedRequest = this.provider.formatRequest(messages, {
      ...modelConfig,
      stream: true
    });

    // Debug the formatted request structure
    debug.log('useSubmit', 'Raw formatted request:', formattedRequest);
    debug.log('useSubmit', 'Provider ID:', this.provider.id);
    debug.log('useSubmit', 'Provider formatRequest output keys:', Object.keys(formattedRequest || {}));

    // Check if messages exists before accessing
    if (!formattedRequest || !formattedRequest.messages) {
      debug.error('useSubmit', 'Invalid formatted request structure - missing messages array');
      throw new Error(`Provider ${this.provider.id} returned invalid request format`);
    }

    try {
      // Get the current abort controller from Zustand
      const { abortController } = useStore.getState();
      debug.log('useSubmit','Using abort controller:', abortController ? 'Present' : 'Missing');
      
      // Create the request payload
      const requestPayload = {
        ...formattedRequest,
        apiKey: this.apiKey
      };

      // Log the full request payload (with redacted API key)
      debug.log('useSubmit', ' Full request payload:', {
        ...requestPayload,
        apiKey: '[REDACTED]'
      });

      const response = await fetch(`/api/chat/${this.provider.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(requestPayload),
        signal: abortController?.signal
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        debug.log('useSubmit','❌ Response error status:', response.status);
        debug.log('useSubmit','❌ Response headers:', Object.fromEntries([...response.headers.entries()]));
        
        // Clone the response before reading it
        const clonedResponse = response.clone();

        try {
          // Try to parse as JSON first
          const errorData = await clonedResponse.json();
          debug.log('useSubmit','❌ Error response body:', errorData);
          if (errorData.error) {
            errorMessage = `API Error: ${errorData.error}`;
          }
        } catch (_) {
          try {
            const errorText = await response.text();
            debug.log('useSubmit','❌ Error response text:', errorText);
            if (errorText) {
              errorMessage = `API Error: ${errorText}`;
            }
          } catch (e) {
            debug.log('useSubmit','❌ Failed to parse error response:', e);
            // Use default message
          }
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      await this.streamHandler.processStream(reader, this.contentCallback);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Submission error details:', error);
        throw error;
      } else {
        throw new Error('Unknown error during submission');
      }
    }
  }
}