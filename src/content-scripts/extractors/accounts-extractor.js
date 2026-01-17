/**
 * Accounts Extractor
 * Extracts Account data from Salesforce Lightning pages
 */

import { getTextContent, getRecordId, getTableRows, cleanText, extractCurrency } from '../utils/dom-helpers.js';

class AccountsExtractor {
    canExtract() {
        return window.location.href.includes('/Account/') ||
            document.title.toLowerCase().includes('account');
    }

    extractList() {
        const accounts = [];

        try {
            const rows = getTableRows('table[role="grid"]');

            if (rows.length === 0) {
                const listItems = document.querySelectorAll('tbody tr, .slds-table tbody tr');
                rows.push(...Array.from(listItems));
            }

            rows.forEach((row, index) => {
                try {
                    const cells = Array.from(row.querySelectorAll('th, td'));

                    if (cells.length === 0) return;

                    const link = row.querySelector('a[href*="/r/Account/"]');
                    const id = link ? link.href.match(/\/r\/Account\/([a-zA-Z0-9]{15,18})/)?.[1] : `account_${Date.now()}_${index}`;

                    const account = {
                        id: id,
                        accountName: getTextContent(cells[0]?.querySelector('a') || cells[0]),
                        website: getTextContent(cells[1]),
                        phone: getTextContent(cells[2]),
                        industry: getTextContent(cells[3]),
                        type: getTextContent(cells[4]),
                        accountOwner: getTextContent(cells[5]),
                        annualRevenue: extractCurrency(getTextContent(cells[6])),
                        extractedAt: Date.now()
                    };

                    if (account.accountName) {
                        accounts.push(account);
                    }
                } catch (error) {
                    console.error('Error extracting account row:', error);
                }
            });
        } catch (error) {
            console.error('Error in extractList:', error);
        }

        return accounts;
    }

    extractDetail() {
        try {
            const id = getRecordId() || `account_${Date.now()}`;

            const account = {
                id: id,
                accountName: this.extractField('Account Name') || this.extractField('Name'),
                website: this.extractField('Website'),
                phone: this.extractField('Phone') || this.extractField('Business Phone'),
                industry: this.extractField('Industry'),
                type: this.extractField('Type') || this.extractField('Account Type'),
                accountOwner: this.extractField('Account Owner') || this.extractField('Owner'),
                annualRevenue: extractCurrency(this.extractField('Annual Revenue') || ''),
                extractedAt: Date.now()
            };

            return account.accountName ? [account] : [];
        } catch (error) {
            console.error('Error in extractDetail:', error);
            return [];
        }
    }

    extractField(labelText) {
        try {
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
        const isListView = window.location.href.includes('/list') ||
            document.querySelector('table[role="grid"]');

        if (isListView) {
            return this.extractList();
        } else {
            return this.extractDetail();
        }
    }
}

const accountsExtractor = new AccountsExtractor();
export default accountsExtractor;
