/**
 * Tasks Extractor
 * Extracts Task data from Salesforce Lightning pages
 */

import { getTextContent, getRecordId, getTableRows, cleanText, parseDate } from '../utils/dom-helpers.js';

class TasksExtractor {
    canExtract() {
        return window.location.href.includes('/Task/') ||
            document.title.toLowerCase().includes('task');
    }

    extractList() {
        const tasks = [];

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

                    const link = row.querySelector('a[href*="/r/Task/"]');
                    const id = link ? link.href.match(/\/r\/Task\/([a-zA-Z0-9]{15,18})/)?.[1] : `task_${Date.now()}_${index}`;

                    const task = {
                        id: id,
                        subject: getTextContent(cells[0]?.querySelector('a') || cells[0]),
                        dueDate: parseDate(getTextContent(cells[1])),
                        status: getTextContent(cells[2]),
                        priority: getTextContent(cells[3]),
                        relatedTo: getTextContent(cells[4]),
                        assignedTo: getTextContent(cells[5]),
                        extractedAt: Date.now()
                    };

                    if (task.subject) {
                        tasks.push(task);
                    }
                } catch (error) {
                    console.error('Error extracting task row:', error);
                }
            });
        } catch (error) {
            console.error('Error in extractList:', error);
        }

        return tasks;
    }

    extractDetail() {
        try {
            const id = getRecordId() || `task_${Date.now()}`;

            const task = {
                id: id,
                subject: this.extractField('Subject'),
                dueDate: parseDate(this.extractField('Due Date') || ''),
                status: this.extractField('Status'),
                priority: this.extractField('Priority'),
                relatedTo: this.extractField('Related To') || this.extractField('Name'),
                assignedTo: this.extractField('Assigned To') || this.extractField('Owner'),
                extractedAt: Date.now()
            };

            return task.subject ? [task] : [];
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

const tasksExtractor = new TasksExtractor();
export default tasksExtractor;
