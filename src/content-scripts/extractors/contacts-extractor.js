/**
 * Contacts Extractor
 * Extracts Contact data from Salesforce Lightning pages
 */

import { getTextContent, getRecordId, getTableRows, cleanText } from '../utils/dom-helpers.js';

class ContactsExtractor {
    canExtract() {
        return window.location.href.includes('/Contact/') ||
            document.title.toLowerCase().includes('contact');
    }

    extractList() {
        const contacts = [];

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

                    const link = row.querySelector('a[href*="/r/Contact/"]');
                    const id = link ? link.href.match(/\/r\/Contact\/([a-zA-Z0-9]{15,18})/)?.[1] : `contact_${Date.now()}_${index}`;

                    const contact = {
                        id: id,
                        name: getTextContent(cells[0]?.querySelector('a') || cells[0]),
                        email: getTextContent(cells[1]),
                        phone: getTextContent(cells[2]),
                        accountName: getTextContent(cells[3]),
                        title: getTextContent(cells[4]),
                        contactOwner: getTextContent(cells[5]),
                        mailingAddress: getTextContent(cells[6]),
                        extractedAt: Date.now()
                    };

                    if (contact.name) {
                        contacts.push(contact);
                    }
                } catch (error) {
                    console.error('Error extracting contact row:', error);
                }
            });
        } catch (error) {
            console.error('Error in extractList:', error);
        }

        return contacts;
    }

    extractDetail() {
        try {
            const id = getRecordId() || `contact_${Date.now()}`;

            const contact = {
                id: id,
                name: this.extractField('Name') || this.extractField('Contact Name'),
                email: this.extractField('Email'),
                phone: this.extractField('Phone') || this.extractField('Business Phone'),
                accountName: this.extractField('Account Name') || this.extractField('Account'),
                title: this.extractField('Title'),
                contactOwner: this.extractField('Contact Owner') || this.extractField('Owner'),
                mailingAddress: this.extractField('Mailing Address') || this.extractField('Address'),
                extractedAt: Date.now()
            };

            return contact.name ? [contact] : [];
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

const contactsExtractor = new ContactsExtractor();
export default contactsExtractor;
