import React from 'react';
import AIHelper from '../../../ai/AIHelper.jsx';

export function AIView({ chatHistory, setChatHistory, dbData, showToast, ownerName, companyName }) {
  return (
    <div className="h-full">
      <AIHelper
        chatHistory={chatHistory}
        setChatHistory={setChatHistory}
        dbData={dbData}
        showToast={showToast}
        ownerName={ownerName}
        companyName={companyName}
      />
    </div>
  );
}

export default AIView;
