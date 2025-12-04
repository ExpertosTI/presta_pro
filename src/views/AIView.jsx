import React from 'react';
import AIHelper from '../ai/AIHelper.jsx';

export function AIView({ chatHistory, setChatHistory, dbData, showToast }) {
  return (
    <div className="h-full">
      <AIHelper
        chatHistory={chatHistory}
        setChatHistory={setChatHistory}
        dbData={dbData}
        showToast={showToast}
      />
    </div>
  );
}

export default AIView;
