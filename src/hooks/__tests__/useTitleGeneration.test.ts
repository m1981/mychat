import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTitleGeneration } from '../useTitleGeneration';
import { TitleGenerationService } from '@src/services/TitleGenerationService';
import { TitleGenerator } from '@src/services/TitleGenerator';
import { ChatSubmissionService } from '@src/services/SubmissionService';
import { providers } from '@type/providers';

/**
 * TESTABILITY CHALLENGES ADDRESSED:
 * 
 * 1. Complex dependencies - Using targeted test doubles and explicit dependency injection
 * 2. Side effects - Isolating and verifying side effects through spies and mocks
 * 3. Global state - Mocking store and verifying its changes
 * 4. API integration - Mocking ChatSubmissionService to avoid real API calls
 */

// Mock dependencies
vi.mock('@src/services/SubmissionService', () => ({
  ChatSubmissionService: vi.fn().mockImplementation(() => ({
    submit: vi.fn().mockResolvedValue('Generated Title')
  }))
}));

vi.mock('@src/services/TitleGenerationService', () => ({
  TitleGenerationService: vi.fn().mockImplementation(() => ({
    generateAndUpdateTitle: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('@src/services/TitleGenerator', () => ({
  TitleGenerator: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' }
  })
}));

// Mock providers
vi.mock('@type/providers', () => ({
  providers: {
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic',
      models: ['claude-3-5-sonnet-20241022'],
      formatRequest: vi.fn().mockReturnValue({
        messages: [{ role: 'user', content: 'Generate a title' }]
      }),
      parseResponse: vi.fn(),
      parseStreamingResponse: vi.fn()
    }
  }
}));

describe('useTitleGeneration hook', () => {
  // Setup test dependencies
  let mockStore: any;
  let mockTitleGenerationService: any;
  
  // Create a factory function to generate consistent dependencies
  function createDependencies(overrides = {}) {
    return {
      store: mockStore,
      titleGenerationService: mockTitleGenerationService,
      ...overrides
    };
  }
  
  beforeEach(() => {
    // Create minimal mocks for dependencies
    mockStore = vi.fn().mockImplementation((selector) => {
      const state = {
        currentChatIndex: 0,
        chats: [
          {
            id: 'test-chat',
            title: 'Test Chat',
            messages: [{ role: 'user', content: 'Hello' }],
            config: { 
              provider: 'anthropic',
              modelConfig: { model: 'claude-3-5-sonnet-20241022' }
            }
          }
        ],
        apiKeys: { anthropic: 'test-key' },
        setChats: vi.fn()
      };
      
      return selector(state);
    });
    
    // Add getState method to mockStore
    mockStore.getState = vi.fn().mockReturnValue({
      currentChatIndex: 0,
      chats: [
        {
          id: 'test-chat',
          title: 'Test Chat',
          messages: [{ role: 'user', content: 'Hello' }],
          config: { 
            provider: 'anthropic',
            modelConfig: { model: 'claude-3-5-sonnet-20241022' }
          }
        }
      ],
      apiKeys: { anthropic: 'test-key' }
    });
    
    // Mock TitleGenerationService
    mockTitleGenerationService = {
      generateAndUpdateTitle: vi.fn().mockResolvedValue(undefined)
    };
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  /**
   * TESTING STRATEGY:
   * 
   * 1. Test initialization and basic functionality
   * 2. Test error handling
   * 3. Test integration with dependencies
   */
  
  describe('Initial state', () => {
    it('should initialize with correct state', () => {
      // Arrange & Act
      const { result } = renderHook(() => useTitleGeneration('anthropic', createDependencies()));
      
      // Assert
      expect(result.current).toHaveProperty('handleTitleGeneration');
      expect(typeof result.current.handleTitleGeneration).toBe('function');
    });
  });
  
  describe('handleTitleGeneration', () => {
    it('should call generateAndUpdateTitle with correct parameters', async () => {
      // Arrange
      const { result } = renderHook(() => useTitleGeneration('anthropic', createDependencies()));
      
      // Act
      await act(async () => {
        await result.current.handleTitleGeneration();
      });
      
      // Assert
      expect(mockTitleGenerationService.generateAndUpdateTitle).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Hello' }],
        0
      );
    });
    
    it('should throw error when no active chat is found', async () => {
      // Arrange - mock store with no chats
      const emptyStore = vi.fn().mockImplementation(() => ({}));
      emptyStore.getState = vi.fn().mockReturnValue({
        currentChatIndex: -1,
        chats: []
      });
      
      const { result } = renderHook(() => useTitleGeneration('anthropic', createDependencies({
        store: emptyStore
      })));
      
      // Act & Assert
      await expect(result.current.handleTitleGeneration()).rejects.toThrow('No active chat found');
    });
    
    it('should propagate errors from title generation service', async () => {
      // Arrange - mock title generation service that throws
      const errorService = {
        generateAndUpdateTitle: vi.fn().mockRejectedValue(new Error('Title generation failed'))
      };
      
      const { result } = renderHook(() => useTitleGeneration('anthropic', createDependencies({
        titleGenerationService: errorService
      })));
      
      // Act & Assert
      await expect(result.current.handleTitleGeneration()).rejects.toThrow('Title generation failed');
    });
  });
  
  describe('TitleGenerationService integration', () => {
    it('should create TitleGenerationService with correct parameters when not injected', () => {
      // Arrange & Act
      renderHook(() => useTitleGeneration('anthropic'));
      
      // Assert
      expect(TitleGenerationService).toHaveBeenCalled();
      expect(TitleGenerator).toHaveBeenCalled();
      
      // Verify TitleGenerator was created with correct parameters
      expect(TitleGenerator).toHaveBeenCalledWith(
        expect.any(Function), // generateTitle function
        'en', // language
        expect.objectContaining({ model: 'claude-3-5-sonnet-20241022' }) // model config
      );
    });
    
    it('should use injected TitleGenerationService when provided', () => {
      // Arrange
      const customService = {
        generateAndUpdateTitle: vi.fn()
      };
      
      // Act
      renderHook(() => useTitleGeneration('anthropic', {
        titleGenerationService: customService
      }));
      
      // Assert - verify the constructor wasn't called
      expect(TitleGenerationService).not.toHaveBeenCalled();
    });
  });
  
  describe('generateTitle function', () => {
    it('should use ChatSubmissionService to generate title', async () => {
      // We need to test the generateTitle function which is internal to the hook
      // We can do this by mocking the TitleGenerator and capturing the function passed to it
      
      // Reset mocks
      vi.clearAllMocks();
      
      // Capture the generateTitle function
      let capturedGenerateTitle: Function | null = null;
      
      // @ts-ignore - mock implementation
      TitleGenerator.mockImplementation((generateTitleFn) => {
        capturedGenerateTitle = generateTitleFn;
        return {};
      });
      
      // Render the hook to create the function
      renderHook(() => useTitleGeneration('anthropic'));
      
      // Verify we captured the function
      expect(capturedGenerateTitle).toBeDefined();
      
      if (capturedGenerateTitle) {
        // Call the function
        await capturedGenerateTitle(
          [{ role: 'user', content: 'Hello' }],
          { model: 'claude-3-5-sonnet-20241022' }
        );
        
        // Verify ChatSubmissionService was used
        expect(ChatSubmissionService).toHaveBeenCalled();
        expect(ChatSubmissionService.mock.instances[0].submit).toHaveBeenCalled();
      }
    });
    
    it('should throw error when model is not provided', async () => {
      // Capture the generateTitle function
      let capturedGenerateTitle: Function | null = null;
      
      // @ts-ignore - mock implementation
      TitleGenerator.mockImplementation((generateTitleFn) => {
        capturedGenerateTitle = generateTitleFn;
        return {};
      });
      
      // Render the hook to create the function
      renderHook(() => useTitleGeneration('anthropic'));
      
      // Verify we captured the function
      expect(capturedGenerateTitle).toBeDefined();
      
      if (capturedGenerateTitle) {
        // Call the function with invalid config
        await expect(capturedGenerateTitle(
          [{ role: 'user', content: 'Hello' }],
          { } // No model
        )).rejects.toThrow('Invalid model configuration');
      }
    });
    
    it('should throw error when ChatSubmissionService fails', async () => {
      // Mock ChatSubmissionService to throw
      // @ts-ignore - mock implementation
      ChatSubmissionService.mockImplementation(() => ({
        submit: vi.fn().mockRejectedValue(new Error('API error'))
      }));
      
      // Capture the generateTitle function
      let capturedGenerateTitle: Function | null = null;
      
      // @ts-ignore - mock implementation
      TitleGenerator.mockImplementation((generateTitleFn) => {
        capturedGenerateTitle = generateTitleFn;
        return {};
      });
      
      // Render the hook to create the function
      renderHook(() => useTitleGeneration('anthropic'));
      
      // Verify we captured the function
      expect(capturedGenerateTitle).toBeDefined();
      
      if (capturedGenerateTitle) {
        // Call the function
        await expect(capturedGenerateTitle(
          [{ role: 'user', content: 'Hello' }],
          { model: 'claude-3-5-sonnet-20241022' }
        )).rejects.toThrow('API error');
      }
    });
  });
});