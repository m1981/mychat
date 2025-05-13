import React from 'react';

import * as useAddChatModule from '@hooks/useAddChat';
import useStore, { StoreState } from '@store/store';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';

import NewChat from '../NewChat';
import '@testing-library/jest-dom';

// Mock the required hooks and modules
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock store with a function to allow state updates
vi.mock('@store/store', () => ({
  default: vi.fn().mockImplementation((selector) => 
    selector({ generating: false } as StoreState)
  )
}));

describe('NewChat', () => {
  const mockAddChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store mock to default state
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => 
      selector({ generating: false } as StoreState)
    );
    vi.spyOn(useAddChatModule, 'default').mockImplementation(() => mockAddChat);
  });

  it('should create new chat when clicked', async () => {
    const user = userEvent.setup();
    render(<NewChat />);
    
    const newChatButton = screen.getByRole('button', { name: 'newChat' });
    await user.click(newChatButton);

    expect(mockAddChat).toHaveBeenCalledTimes(1);
    expect(mockAddChat).toHaveBeenCalledWith(undefined);
  });

  it('should create new chat in folder when folder prop is provided', async () => {
    const user = userEvent.setup();
    render(<NewChat folder="testFolder" />);
    
    const newChatButton = screen.getByRole('button', { name: 'newChat' });
    await user.click(newChatButton);

    expect(mockAddChat).toHaveBeenCalledTimes(1);
    expect(mockAddChat).toHaveBeenCalledWith('testFolder');
  });

  it('should not create new chat when generating is true', async () => {
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => 
      selector({ generating: true } as StoreState)
    );
    
    const user = userEvent.setup();
    render(<NewChat />);
    
    const newChatButton = screen.getByRole('button', { name: 'newChat' });
    await user.click(newChatButton);

    expect(mockAddChat).not.toHaveBeenCalled();
  });

  it('should have correct styling when generating', () => {
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => 
      selector({ generating: true } as StoreState)
    );
    render(<NewChat />);
    
    const button = screen.getByRole('button', { name: 'newChat' });
    expect(button.className).toContain('cursor-not-allowed');
    expect(button.className).toContain('opacity-40');
  });

  it('should have correct styling when not generating', () => {
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => 
      selector({ generating: false } as StoreState)
    );
    render(<NewChat />);
    
    const button = screen.getByRole('button', { name: 'newChat' });
    expect(button.className).toContain('hover:bg-gray-500/10');
    expect(button.className).toContain('cursor-pointer');
  });

  it('should have different styling when in folder mode', () => {
    render(<NewChat folder="testFolder" />);
    
    const button = screen.getByRole('button', { name: 'newChat' });
    expect(button).toHaveClass('justify-start');
    expect(button).not.toHaveClass('p-2');
    expect(button).not.toHaveClass('gap-3');
    expect(button).not.toHaveClass('mb-2');
  });
});