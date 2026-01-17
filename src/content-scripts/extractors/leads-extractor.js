/**
 * Leads Extractor
 * Extracts Lead data from Salesforce Lightning pages
 */

import { getTextContent, extractFieldValue, getRecordId, getTableRows, extractTableRow, cleanText } from '../utils/dom-helpers.js';

class LeadsExtractor {
    canExtract() {
        // Check if we're on a leads page
        return window.location.href.includes('/Lead/') ||
            document.title.toLowerCase().includes('lead');
    }

    extractList() {
        const leads = [];

        try {
            // Try multiple selectors to find table rows
            let rows = [];

            // Method 1: Standard grid table
            const gridTable = document.querySelector('table[role="grid"]');
            if (gridTable) {
                rows = Array.from(gridTable.querySelectorAll('tbody tr'));
                console.log('[Leads Extractor] Found rows via grid table:', rows.length);
            }

            // Method 2: Any table with tbody
            if (rows.length === 0) {
                const anyTable = document.querySelector('table tbody');
                if (anyTable) {
                    rows = Array.from(anyTable.parentElement.querySelectorAll('tbody tr'));
                    console.log('[Leads Extractor] Found rows via any table:', rows.length);
                }
            }

            // Method 3: Direct tbody tr search
            if (rows.length === 0) {
                rows = Array.from(document.querySelectorAll('tbody tr'));
                console.log('[Leads Extractor] Found rows via direct search:', rows.length);
            }

            // Method 4: SLDS table
            if (rows.length === 0) {
                rows = Array.from(document.querySelectorAll('.slds-table tbody tr, table.slds-table tr'));
                console.log('[Leads Extractor] Found rows via SLDS table:', rows.length);
            }

            if (rows.length === 0) {
                console.warn('[Leads Extractor] No table rows found with any selector');
                return [];
            }

            rows.forEach((row, index) => {
                try {
                    const cells = Array.from(row.querySelectorAll('th, td'));

                    if (cells.length === 0) return;

                    // Extract record ID from link
                    const link = row.querySelector('a[href*="/r/Lead/"], a[href*="/Lead/"]');
                    const id = link ? (link.href.match(/\/(?:r\/)?Lead\/([a-zA-Z0-9]{15,18})/)?.[1] || `lead_${Date.now()}_${index}`) : `lead_${Date.now()}_${index}`;

                    const lead = {
                        id: id,
                        name: getTextContent(cells[0]?.querySelector('a') || cells[0]),
                        company: getTextContent(cells[1]),
                        email: getTextContent(cells[2]),
                        phone: getTextContent(cells[3]),
                        leadSource: getTextContent(cells[4]),
                        leadStatus: getTextContent(cells[5]),
                        leadOwner: getTextContent(cells[6]),
                        extractedAt: Date.now()
                    };

                    // Only add if we have at least a name
                    if (lead.name) {
                        leads.push(lead);
                        console.log('[Leads Extractor] Extracted lead:', lead.name);
                    }
                } catch (error) {
                    console.error('[Leads Extractor] Error extracting lead row:', error);
                }
            });
        } catch (error) {
            console.error('[Leads Extractor] Error in extractList:', error);
        }

        console.log('[Leads Extractor] Total leads extracted:', leads.length);
        return leads;
    }

    extractDetail() {
        try {
            const id = getRecordId() || `lead_${Date.now()}`;

            // Extract fields from detail page
            const lead = {
                id: id,
                name: this.extractField('Name') || this.extractField('Lead Name'),
                company: this.extractField('Company'),
                email: this.extractField('Email'),
                phone: this.extractField('Phone'),
                leadSource: this.extractField('Lead Source'),
                leadStatus: this.extractField('Lead Status') || this.extractField('Status'),
                leadOwner: this.extractField('Lead Owner') || this.extractField('Owner'),
                extractedAt: Date.now()
            };

            return lead.name ? [lead] : [];
        } catch (error) {
            console.error('Error in extractDetail:', error);
            return [];
        }
    }

    extractField(labelText) {
        try {
            // Method 1: Find by label text
            const labels = Array.from(document.querySelectorAll('span.slds-form-element__label, label'));
            const labelElement = labels.find(el =>
                cleanText(el.textContent).toLowerCase() === labelText.toLowerCase()
            );

            if (labelElement) {
                const parent = labelElement.closest('.slds-form-element, .field-container, div');
                if (parent) {
                    const value = parent.querySelector('.slds-form-element__control, .field-value, a, span:not(.slds-form-element__label)');
                    if (value) {
                        return cleanText(value.textContent);
                    }
                }
            }

            // Method 2: Try data attributes
            const fieldElement = document.querySelector(`[data-field-label="${labelText}"], [title="${labelText}"]`);
            if (fieldElement) {
                return cleanText(fieldElement.textContent);
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    extract() {
        console.log('[Leads Extractor] Starting extraction...');

        // Check if we're on a detail/record page (most reliable)
        const isDetailPage = window.location.href.match(/\/r\/Lead\/[a-zA-Z0-9]{15,18}\/view/) ||
            document.querySelector('.record-detail, [class*="forceRecordLayout"]');

        if (isDetailPage) {
            console.log('[Leads Extractor] Detected detail page - using detail extraction');
            return this.extractDetail();
        }

        // Try list view extraction (may have limited results due to virtualization)
        console.log('[Leads Extractor] Attempting list view extraction...');
        const listResults = this.extractList();

        if (listResults.length > 0) {
            console.log('[Leads Extractor] Successfully extracted from list view');
            return listResults;
        }

        // If list view returns nothing, try extracting selected rows
        console.log('[Leads Extractor] No list results, trying selected rows...');
        return this.extractSelectedRows();
    }

    extractSelectedRows() {
        const leads = [];

        try {
            // Find selected/checked rows (these are rendered in DOM)
            const selectedRows = document.querySelectorAll('[aria-selected="true"], tr[class*="selected"], input[type="checkbox"]:checked');
            console.log('[Leads Extractor] Found selected rows:', selectedRows.length);

            selectedRows.forEach((element, index) => {
                try {
                    // Get the parent row
                    const row = element.closest('tr');
                    if (!row) return;

                    const cells = Array.from(row.querySelectorAll('th, td'));
                    if (cells.length === 0) return;

                    const link = row.querySelector('a[href*="/r/Lead/"], a[href*="/Lead/"]');
                    const id = link ? (link.href.match(/\/(?:r\/)?Lead\/([a-zA-Z0-9]{15,18})/)?.[1] || `lead_${Date.now()}_${index}`) : `lead_${Date.now()}_${index}`;

                    const lead = {
                        id: id,
                        name: getTextContent(cells[0]?.querySelector('a') || cells[0]),
                        company: getTextContent(cells[1]),
                        email: getTextContent(cells[2]),
                        phone: getTextContent(cells[3]),
                        leadSource: getTextContent(cells[4]),
                        leadStatus: getTextContent(cells[5]),
                        leadOwner: getTextContent(cells[6]),
                        extractedAt: Date.now()
                    };

                    if (lead.name) {
                        leads.push(lead);
                        console.log('[Leads Extractor] Extracted selected lead:', lead.name);
                    }
                } catch (error) {
                    console.error('[Leads Extractor] Error extracting selected row:', error);
                }
            });
        } catch (error) {
            console.error('[Leads Extractor] Error in extractSelectedRows:', error);
        }

        console.log('[Leads Extractor] Total selected leads extracted:', leads.length);
        return leads;
    }
}

const leadsExtractor = new LeadsExtractor();
export default leadsExtractor;
