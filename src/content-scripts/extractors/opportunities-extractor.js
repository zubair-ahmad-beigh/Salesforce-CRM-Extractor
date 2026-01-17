/**
 * Opportunities Extractor
 * Extracts Opportunity data from Salesforce Lightning pages
 * Includes stage detection and probability extraction
 */

import { getTextContent, getRecordId, getTableRows, cleanText, extractCurrency, extractPercentage, parseDate } from '../utils/dom-helpers.js';

// Standard Salesforce Opportunity Stages
export const OPPORTUNITY_STAGES = {
    PROSPECTING: 'Prospecting',
    QUALIFICATION: 'Qualification',
    PROPOSAL: 'Proposal',
    NEGOTIATION: 'Negotiation',
    CLOSED_WON: 'Closed Won',
    CLOSED_LOST: 'Closed Lost'
};

class OpportunitiesExtractor {
    canExtract() {
        return window.location.href.includes('/Opportunity/') ||
            document.title.toLowerCase().includes('opportunity') ||
            document.title.toLowerCase().includes('pipeline');
    }

    normalizeStage(stageText) {
        if (!stageText) return null;

        const normalized = stageText.toLowerCase().trim();

        if (normalized.includes('prospect')) return OPPORTUNITY_STAGES.PROSPECTING;
        if (normalized.includes('qualif')) return OPPORTUNITY_STAGES.QUALIFICATION;
        if (normalized.includes('proposal') || normalized.includes('quote')) return OPPORTUNITY_STAGES.PROPOSAL;
        if (normalized.includes('negotiat')) return OPPORTUNITY_STAGES.NEGOTIATION;
        if (normalized.includes('closed') && normalized.includes('won')) return OPPORTUNITY_STAGES.CLOSED_WON;
        if (normalized.includes('closed') && normalized.includes('lost')) return OPPORTUNITY_STAGES.CLOSED_LOST;

        // Return original if no match
        return stageText;
    }

    extractList() {
        const opportunities = [];

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

                    const link = row.querySelector('a[href*="/r/Opportunity/"]');
                    const id = link ? link.href.match(/\/r\/Opportunity\/([a-zA-Z0-9]{15,18})/)?.[1] : `opp_${Date.now()}_${index}`;

                    const opportunity = {
                        id: id,
                        opportunityName: getTextContent(cells[0]?.querySelector('a') || cells[0]),
                        amount: extractCurrency(getTextContent(cells[1])),
                        stage: this.normalizeStage(getTextContent(cells[2])),
                        probability: extractPercentage(getTextContent(cells[3])),
                        closeDate: parseDate(getTextContent(cells[4])),
                        forecastCategory: getTextContent(cells[5]),
                        opportunityOwner: getTextContent(cells[6]),
                        associatedAccount: getTextContent(cells[7]),
                        extractedAt: Date.now()
                    };

                    if (opportunity.opportunityName) {
                        opportunities.push(opportunity);
                    }
                } catch (error) {
                    console.error('Error extracting opportunity row:', error);
                }
            });
        } catch (error) {
            console.error('Error in extractList:', error);
        }

        return opportunities;
    }

    extractDetail() {
        try {
            const id = getRecordId() || `opp_${Date.now()}`;

            const opportunity = {
                id: id,
                opportunityName: this.extractField('Opportunity Name') || this.extractField('Name'),
                amount: extractCurrency(this.extractField('Amount') || ''),
                stage: this.normalizeStage(this.extractField('Stage') || this.extractField('Opportunity Stage')),
                probability: extractPercentage(this.extractField('Probability') || this.extractField('Probability (%)') || ''),
                closeDate: parseDate(this.extractField('Close Date') || ''),
                forecastCategory: this.extractField('Forecast Category'),
                opportunityOwner: this.extractField('Opportunity Owner') || this.extractField('Owner'),
                associatedAccount: this.extractField('Account Name') || this.extractField('Account'),
                extractedAt: Date.now()
            };

            return opportunity.opportunityName ? [opportunity] : [];
        } catch (error) {
            console.error('Error in extractDetail:', error);
            return [];
        }
    }

    extractKanban() {
        const opportunities = [];

        try {
            // Find kanban columns
            const columns = document.querySelectorAll('.kanban-column, [class*="kanban"], [class*="pipeline"]');

            columns.forEach(column => {
                // Get stage from column header
                const stageHeader = column.querySelector('.column-header, h2, h3, [class*="header"]');
                const stage = stageHeader ? this.normalizeStage(getTextContent(stageHeader)) : null;

                // Get cards in this column
                const cards = column.querySelectorAll('.kanban-card, [class*="card"]');

                cards.forEach((card, index) => {
                    try {
                        const link = card.querySelector('a[href*="/r/Opportunity/"]');
                        const id = link ? link.href.match(/\/r\/Opportunity\/([a-zA-Z0-9]{15,18})/)?.[1] : `opp_kanban_${Date.now()}_${index}`;

                        const opportunity = {
                            id: id,
                            opportunityName: getTextContent(card.querySelector('.card-title, h4, a')),
                            amount: extractCurrency(getTextContent(card)),
                            stage: stage,
                            probability: extractPercentage(getTextContent(card)),
                            closeDate: null,
                            forecastCategory: null,
                            opportunityOwner: null,
                            associatedAccount: null,
                            extractedAt: Date.now()
                        };

                        if (opportunity.opportunityName) {
                            opportunities.push(opportunity);
                        }
                    } catch (error) {
                        console.error('Error extracting kanban card:', error);
                    }
                });
            });
        } catch (error) {
            console.error('Error in extractKanban:', error);
        }

        return opportunities;
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
        // Check for kanban view
        const isKanbanView = window.location.href.includes('/kanban') ||
            window.location.href.includes('/pipeline') ||
            document.querySelector('.kanban-board, [class*="kanban"]');

        if (isKanbanView) {
            return this.extractKanban();
        }

        const isListView = window.location.href.includes('/list') ||
            document.querySelector('table[role="grid"]');

        if (isListView) {
            return this.extractList();
        } else {
            return this.extractDetail();
        }
    }
}

const opportunitiesExtractor = new OpportunitiesExtractor();
export default opportunitiesExtractor;
