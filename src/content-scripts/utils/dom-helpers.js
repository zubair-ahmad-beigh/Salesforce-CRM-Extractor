/**
 * DOM Helper Utilities
 * Provides common functions for DOM manipulation and data extraction
 */

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            return resolve(element);
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Extract field value by label text
 */
export function extractFieldValue(labelText, container = document) {
    try {
        // Try to find label element
        const labels = Array.from(container.querySelectorAll('span, label, div'));
        const labelElement = labels.find(el =>
            el.textContent.trim().toLowerCase() === labelText.toLowerCase()
        );

        if (!labelElement) return null;

        // Find the associated value element
        let valueElement = labelElement.nextElementSibling;

        // Sometimes the value is in a parent's sibling
        if (!valueElement || !valueElement.textContent.trim()) {
            const parent = labelElement.closest('div');
            if (parent) {
                valueElement = parent.querySelector('a, span:not(:first-child), div:not(:first-child)');
            }
        }

        return valueElement ? valueElement.textContent.trim() : null;
    } catch (error) {
        console.error('Error extracting field value:', error);
        return null;
    }
}

/**
 * Extract Salesforce record ID from URL or DOM
 */
export function getRecordId() {
    // Try URL first
    const urlMatch = window.location.pathname.match(/\/([a-zA-Z0-9]{15,18})\//);
    if (urlMatch) {
        return urlMatch[1];
    }

    // Try DOM attributes
    const recordElement = document.querySelector('[data-record-id], [data-recordid]');
    if (recordElement) {
        return recordElement.getAttribute('data-record-id') ||
            recordElement.getAttribute('data-recordid');
    }

    return null;
}

/**
 * Get text content safely
 */
export function getTextContent(element) {
    if (!element) return '';
    return element.textContent?.trim() || '';
}

/**
 * Get attribute safely
 */
export function getAttribute(element, attr) {
    if (!element) return '';
    return element.getAttribute(attr) || '';
}

/**
 * Click element and wait for navigation/update
 */
export async function clickAndWait(element, waitTime = 1000) {
    if (!element) return false;

    element.click();
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return true;
}

/**
 * Handle pagination - click next button if exists
 */
export async function handlePagination() {
    const nextButton = document.querySelector(
        'button[title="Next Page"], ' +
        'a[title="Next"], ' +
        'button:has(lightning-primitive-icon[icon-name="utility:chevronright"])'
    );

    if (nextButton && !nextButton.disabled) {
        await clickAndWait(nextButton, 2000);
        return true;
    }

    return false;
}

/**
 * Extract data from table row
 */
export function extractTableRow(row) {
    const cells = Array.from(row.querySelectorAll('td, th'));
    return cells.map(cell => getTextContent(cell));
}

/**
 * Get all table rows
 */
export function getTableRows(tableSelector = 'table') {
    const table = document.querySelector(tableSelector);
    if (!table) return [];

    return Array.from(table.querySelectorAll('tbody tr'));
}

/**
 * Extract href from link element
 */
export function extractHref(element) {
    if (!element) return '';
    const link = element.querySelector('a') || element;
    return link.href || '';
}

/**
 * Clean and normalize text
 */
export function cleanText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
}

/**
 * Parse Salesforce date format
 */
export function parseDate(dateString) {
    if (!dateString) return null;
    try {
        return new Date(dateString).toISOString();
    } catch {
        return dateString;
    }
}

/**
 * Extract currency value
 */
export function extractCurrency(text) {
    if (!text) return null;
    const match = text.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
}

/**
 * Extract percentage value
 */
export function extractPercentage(text) {
    if (!text) return null;
    const match = text.match(/(\d+)%/);
    return match ? parseInt(match[1]) : null;
}
