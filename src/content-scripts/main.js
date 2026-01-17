/**
 * Content Script Main Entry Point
 * Coordinates extraction, detection, and communication with service worker
 */

import objectDetector, { OBJECT_TYPES } from './detectors/object-detector.js';
import leadsExtractor from './extractors/leads-extractor.js';
import contactsExtractor from './extractors/contacts-extractor.js';
import accountsExtractor from './extractors/accounts-extractor.js';
import opportunitiesExtractor from './extractors/opportunities-extractor.js';
import tasksExtractor from './extractors/tasks-extractor.js';
import DOMObserver from './observers/mutation-observer.js';

class SalesforceExtractor {
    constructor() {
        this.isExtracting = false;
        this.observer = null;
        this.statusIndicator = null;
        this.init();
    }

    init() {
        console.log('[SF Extractor] Initializing...');

        // Listen for messages from popup/service worker
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sendResponse);
            return true; // Keep channel open for async response
        });

        // Initialize DOM observer
        this.observer = new DOMObserver(() => {
            // Auto-extract on DOM changes (optional feature)
            // this.performExtraction();
        });

        // Start observing
        this.observer.start();

        // Initialize status indicator
        this.initStatusIndicator();

        console.log('[SF Extractor] Initialized successfully');
    }

    async handleMessage(message, sendResponse) {
        console.log('[SF Extractor] Received message:', message.type);

        switch (message.type) {
            case 'EXTRACT_CURRENT_OBJECT':
                // Send immediate response to keep channel open
                sendResponse({ success: true, message: 'Extraction started' });
                // Perform extraction asynchronously
                this.performExtraction().catch(error => {
                    console.error('[SF Extractor] Extraction error:', error);
                });
                break;

            case 'GET_PAGE_INFO':
                const pageInfo = objectDetector.getPageInfo();
                sendResponse({ success: true, data: pageInfo });
                break;

            case 'PING':
                sendResponse({ success: true, message: 'Content script active' });
                break;

            default:
                sendResponse({ success: false, message: 'Unknown message type' });
        }
    }

    async performExtraction() {
        if (this.isExtracting) {
            console.log('[SF Extractor] Extraction already in progress');
            return;
        }

        this.isExtracting = true;
        this.showStatus('Detecting object type...', 'detecting');

        try {
            // Detect object type
            const pageInfo = objectDetector.getPageInfo();
            console.log('[SF Extractor] Page info:', pageInfo);

            if (pageInfo.objectType === OBJECT_TYPES.UNKNOWN) {
                throw new Error('Unable to detect Salesforce object type');
            }

            this.showStatus(`Extracting ${pageInfo.objectType}...`, 'extracting');

            // Select appropriate extractor
            let extractor;
            switch (pageInfo.objectType) {
                case OBJECT_TYPES.LEAD:
                    extractor = leadsExtractor;
                    break;
                case OBJECT_TYPES.CONTACT:
                    extractor = contactsExtractor;
                    break;
                case OBJECT_TYPES.ACCOUNT:
                    extractor = accountsExtractor;
                    break;
                case OBJECT_TYPES.OPPORTUNITY:
                    extractor = opportunitiesExtractor;
                    break;
                case OBJECT_TYPES.TASK:
                    extractor = tasksExtractor;
                    break;
                default:
                    throw new Error('No extractor available for this object type');
            }

            // Wait for page to be fully loaded
            await this.waitForPageLoad();

            // Extract data
            const records = extractor.extract();
            console.log('[SF Extractor] Extracted records:', records.length);

            if (records.length === 0) {
                this.showStatus('No records found', 'warning');

                // Send to service worker anyway
                chrome.runtime.sendMessage({
                    type: 'EXTRACTION_COMPLETE',
                    objectType: pageInfo.objectType,
                    records: [],
                    pageInfo: pageInfo
                });

                setTimeout(() => this.hideStatus(), 3000);
                return;
            }

            // Send to service worker for storage
            chrome.runtime.sendMessage({
                type: 'EXTRACTION_COMPLETE',
                objectType: pageInfo.objectType,
                records: records,
                pageInfo: pageInfo
            }, (response) => {
                if (response && response.success) {
                    this.showStatus(`✓ Extracted ${records.length} ${pageInfo.objectType}`, 'success');
                } else {
                    this.showStatus('✗ Failed to save data', 'error');
                }

                setTimeout(() => this.hideStatus(), 3000);
            });

        } catch (error) {
            console.error('[SF Extractor] Extraction error:', error);
            this.showStatus(`✗ ${error.message}`, 'error');
            setTimeout(() => this.hideStatus(), 3000);
        } finally {
            this.isExtracting = false;
        }
    }

    async waitForPageLoad() {
        // Wait for Salesforce Lightning to finish loading
        return new Promise((resolve) => {
            const checkLoading = () => {
                const spinner = document.querySelector('.slds-spinner, [class*="loading"]');
                if (!spinner) {
                    resolve();
                } else {
                    setTimeout(checkLoading, 500);
                }
            };

            setTimeout(checkLoading, 500);
        });
    }

    initStatusIndicator() {
        // Inject status indicator script
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected-ui.js');
        (document.head || document.documentElement).appendChild(script);
    }

    showStatus(message, type = 'info') {
        // Send message to injected UI
        window.postMessage({
            type: 'SF_EXTRACTOR_STATUS',
            message: message,
            statusType: type
        }, '*');
    }

    hideStatus() {
        window.postMessage({
            type: 'SF_EXTRACTOR_HIDE'
        }, '*');
    }
}

// Initialize extractor
const extractor = new SalesforceExtractor();
