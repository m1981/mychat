import { TitleGenerator } from '../TitleGenerator';
import { MessageInterface } from '@type/chat';

// Mock provider implementation
const mockProvider = {
  formatRequest: jest.fn(),
  parseResponse: jest.fn(),
  submitCompletion: jest.fn(),
  submitStream: jest.fn()
};

describe('TitleGenerator', () => {
  let titleGenerator: TitleGenerator;
  
  beforeEach(() => {
    jest.clearAllMocks();
    titleGenerator = new TitleGenerator(mockProvider);
  });
  
  it('should generate a title from messages', async () => {
    // Arrange
    const messages: MessageInterface[] = [
      { role: 'user', content: 'Hello, how are you?' },
      { role: 'assistant', content: 'I am doing well, thank you for asking!' }
    ];
    
    const mockConfig = {
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 100,
      top_p: 1
    };
    
    mockProvider.formatRequest.mockReturnValue({
      messages: expect.any(Array),
      model: 'gpt-4',
      max_tokens: 100,
      temperature: 0.7,
      top_p: 1,
      stream: false
    });
    
    mockProvider.submitCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Friendly Greeting Conversation' } }]
    });
    
    // Act
    const title = await titleGenerator.generateChatTitle(messages, mockConfig);
    
    // Assert
    expect(mockProvider.formatRequest).toHaveBeenCalledWith(
      expect.objectContaining({ stream: false }),
      expect.any(Array)
    );
    expect(mockProvider.submitCompletion).toHaveBeenCalled();
    expect(title).toBe('Friendly Greeting Conversation');
  });
  
  it('should clean up title text', async () => {
    // Arrange
    const messages: MessageInterface[] = [
      { role: 'user', content: 'What is TypeScript?' },
      { role: 'assistant', content: 'TypeScript is a superset of JavaScript...' }
    ];
    
    mockProvider.formatRequest.mockReturnValue({});
    mockProvider.submitCompletion.mockResolvedValue({
      choices: [{ message: { content: '"TypeScript Discussion"' } }]
    });
    
    // Act
    const title = await titleGenerator.generateChatTitle(messages, {
      model: 'model',
      temperature: 0.5,
      max_tokens: 100,
      top_p: 1
    });
    
    // Assert
    expect(title).toBe('TypeScript Discussion');
  });
  
  it('should handle errors and return default title', async () => {
    // Arrange
    const messages: MessageInterface[] = [
      { role: 'user', content: 'Hello' }
    ];
    
    mockProvider.formatRequest.mockImplementation(() => {
      throw new Error('Network error');
    });
    
    // Act
    const title = await titleGenerator.generateChatTitle(messages, {
      model: 'model',
      temperature: 0.5,
      max_tokens: 100,
      top_p: 1
    });
    
    // Assert
    expect(title).toBe('New Conversation');
  });
});