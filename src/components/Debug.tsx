import useStore from '@store/store';
import { useEffect, useRef, useState } from 'react';
import { LogModule } from '@config/logging';
import { debug } from '@utils/debug';

const Debug = () => {
  const store = useStore();
  const renderCount = useRef(0);
  const [activeModules, setActiveModules] = useState<Set<LogModule>>(
    new Set(debug.getActiveModules())
  );

  // Track renders
  useEffect(() => {
    renderCount.current += 1;
  });

  const toggleModule = (module: LogModule) => {
    const newModules = new Set(activeModules);
    if (newModules.has(module)) {
      newModules.delete(module);
    } else {
      newModules.add(module);
    }
    setActiveModules(newModules);
    debug.setActiveModules(Array.from(newModules));
  };

  // Optional: Visual debugging overlay
  if (process.env.NODE_ENV === 'development') {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          fontSize: '12px',
          fontFamily: 'monospace',
          maxWidth: '300px',
          maxHeight: '400px',
          overflow: 'auto',
          zIndex: 9999,
        }}
      >
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '8px', marginBottom: '8px' }}>
          <strong>Debug Modules:</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            {(['store', 'api', 'chat', 'perf', 'ui'] as LogModule[]).map((module) => (
              <label
                key={module}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={activeModules.has(module)}
                  onChange={() => toggleModule(module)}
                  style={{ marginRight: '6px' }}
                />
                {module.charAt(0).toUpperCase() + module.slice(1)}
              </label>
            ))}
          </div>
        </div>
        <div>Renders: {renderCount.current}</div>
        <div>Generating: {String(store.generating)}</div>
        <div>Chat Index: {store.currentChatIndex}</div>
        <div>Messages: {store.chats?.[store.currentChatIndex]?.messages.length || 0}</div>
        <div>Total Chats: {store.chats?.length || 0}</div>
      </div>
    );
  }

  return null;
};

export default Debug;
