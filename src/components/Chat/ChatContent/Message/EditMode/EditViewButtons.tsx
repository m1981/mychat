import React from 'react';

import { useMessageEditorContext } from '@components/Chat/ChatContent/Message/context/MessageEditorContext';
import { EditViewButtonsProps } from '@components/Chat/ChatContent/Message/interfaces';

/**
 * EditViewButtons component - Provides action buttons for the edit view
 */
const EditViewButtons: React.FC<EditViewButtonsProps> = ({ customSaveHandler }) => {
  const {
    handleSave,
    handleSaveAndSubmit,
    setIsEdit,
    isComposer
  } = useMessageEditorContext();

  const onSave = () => {
    if (customSaveHandler) {
      customSaveHandler();
    } else {
      handleSave();
    }
  };

  return (
    <div className="flex justify-end gap-2 mt-2">
      {!isComposer && (
        <button
          className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setIsEdit(false)}
          data-testid="cancel-edit-button"
        >
          Cancel
        </button>
      )}
      
      <button
        className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
        onClick={onSave}
        data-testid="save-edit-button"
      >
        Save
      </button>
      
      {isComposer && (
        <button
          className="px-3 py-1 text-sm rounded bg-green-500 text-white hover:bg-green-600"
          onClick={handleSaveAndSubmit}
          data-testid="save-submit-button"
        >
          Save & Submit
        </button>
      )}
    </div>
  );
};

export default EditViewButtons;