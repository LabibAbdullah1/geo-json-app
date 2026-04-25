import React from 'react';
import MonacoEditor from '@monaco-editor/react';

const Editor = ({ value, onChange }) => {
  return (
    <MonacoEditor
      height="100%"
      language="json"
      theme="vs-dark"
      value={value}
      onChange={(val) => onChange(val)}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16, bottom: 16 },
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    />
  );
};

export default Editor;
