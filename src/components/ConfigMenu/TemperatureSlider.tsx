import React from 'react';
import { useTranslation } from 'react-i18next';
import { ModelConfig } from '@type/chat';

interface TemperatureSliderProps {
  modelConfig: ModelConfig;
  updateModelConfig: (config: Partial<ModelConfig>) => void;
}

const TemperatureSlider: React.FC<TemperatureSliderProps> = ({
  modelConfig,
  updateModelConfig,
}) => {
  const { t } = useTranslation('model');

  return (
    <div className="mt-5 pt-5 border-t border-gray-500">
      <label className="block text-sm font-medium text-gray-900 dark:text-white">
        {t('temperature.label')}: {modelConfig.temperature}
      </label>
      <input
        type="range"
        value={modelConfig.temperature}
        onChange={(e) => {
          updateModelConfig({
            temperature: Number(e.target.value),
          });
        }}
        min={0}
        max={2}
        step={0.1}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="min-w-fit text-gray-500 dark:text-gray-300 text-xs mt-2">
        {t('temperature.description')}
      </div>
    </div>
  );
};

export default TemperatureSlider;