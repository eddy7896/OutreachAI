// Scrape data from the active LinkedIn profile page
function scrapeProfile() {
  // Wait a little bit for DOM to be fully loaded since LinkedIn is a SPA
  try {
    // Top card name is usually an h1
    const nameElement = document.querySelector('h1');
    const fullName = nameElement ? nameElement.innerText.trim() : '';
    
    let firstName = '';
    let lastName = '';
    if (fullName) {
      const parts = fullName.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    // Headline is usually right under the h1, often in a div with text-body-medium
    const headlineElement = document.querySelector('.text-body-medium');
    const jobTitle = headlineElement ? headlineElement.innerText.trim() : '';

    // Company is often in an aria-label "Current company" or a button in the top card
    const companyElement = document.querySelector('[aria-label^="Current company"]');
    let company = '';
    if (companyElement) {
      company = companyElement.innerText.trim();
    } else {
      // Fallback: look for the first experience item
      const experienceCompany = document.querySelector('#experience ~ .pvs-list__outer-container .t-14.t-normal span[aria-hidden="true"]');
      if (experienceCompany) {
        // usually format is "Company Name · Full-time"
        company = experienceCompany.innerText.split('·')[0].trim();
      }
    }

    // Email is rarely visible unless you click "Contact Info", so we usually won't find it directly on the main page.
    // The backend will handle guessing the email using Apollo/Hunter.

    // About section
    const aboutElement = document.querySelector('#about ~ .pvs-list__outer-container .t-14.t-normal span[aria-hidden="true"]');
    const aboutText = aboutElement ? aboutElement.innerText.trim() : '';

    return {
      firstName,
      lastName,
      jobTitle,
      company,
      industry: 'Unknown', // Hard to scrape accurately from new UI without clicking "Contact Info"
      remarks: aboutText ? `LinkedIn About:\n${aboutText}` : ''
    };
  } catch (error) {
    console.error('Scraping error:', error);
    return null;
  }
}

// Send the scraped data back to the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape_profile") {
    const data = scrapeProfile();
    sendResponse({ data });
  }
  return true;
});
