document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('backendUrl');
  const keyInput = document.getElementById('apiKey');
  const importBtn = document.getElementById('importBtn');
  const statusMsg = document.getElementById('statusMsg');

  // Load saved settings
  chrome.storage.sync.get(['backendUrl', 'apiKey'], (result) => {
    if (result.backendUrl) urlInput.value = result.backendUrl;
    if (result.apiKey) keyInput.value = result.apiKey;
  });

  // Save settings on blur
  const saveSettings = () => {
    chrome.storage.sync.set({
      backendUrl: urlInput.value.replace(/\/$/, ''), // remove trailing slash
      apiKey: keyInput.value
    });
  };
  urlInput.addEventListener('blur', saveSettings);
  keyInput.addEventListener('blur', saveSettings);

  const showStatus = (msg, isError = false) => {
    statusMsg.textContent = msg;
    statusMsg.className = 'status ' + (isError ? 'error' : 'success');
  };

  importBtn.addEventListener('click', async () => {
    saveSettings();
    const backendUrl = urlInput.value.replace(/\/$/, '');
    const apiKey = keyInput.value;

    if (!backendUrl || !apiKey) {
      showStatus('Please enter URL and API Key', true);
      return;
    }

    importBtn.disabled = true;
    showStatus('Scraping page...', false);

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('linkedin.com/in/')) {
        showStatus('Must be on a LinkedIn profile page', true);
        importBtn.disabled = false;
        return;
      }

      // Execute content script to scrape
      chrome.tabs.sendMessage(tab.id, { action: "scrape_profile" }, async (response) => {
        if (chrome.runtime.lastError) {
          // Content script might not be injected yet
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            });
            // Try again
            chrome.tabs.sendMessage(tab.id, { action: "scrape_profile" }, handleScrapeResult);
          } catch (e) {
            showStatus('Failed to inject script: refresh page', true);
            importBtn.disabled = false;
          }
        } else {
          handleScrapeResult(response);
        }
      });

      async function handleScrapeResult(response) {
        if (!response || !response.data) {
          showStatus('Failed to extract profile data', true);
          importBtn.disabled = false;
          return;
        }

        const leadData = response.data;
        showStatus('Sending to Outreach AI...', false);

        try {
          const res = await fetch(`${backendUrl}/api/leads/import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(leadData)
          });

          const data = await res.json();
          if (res.ok && data.success) {
            showStatus('Success! Lead imported.', false);
          } else {
            showStatus(data.error || 'Failed to import lead', true);
          }
        } catch (error) {
          showStatus('Network error connecting to backend', true);
        }
        
        importBtn.disabled = false;
      }

    } catch (err) {
      showStatus(err.message || 'Unknown error', true);
      importBtn.disabled = false;
    }
  });
});
