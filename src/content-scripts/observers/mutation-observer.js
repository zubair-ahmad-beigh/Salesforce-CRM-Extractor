/**
 * Mutation Observer
 * Watches for DOM changes in Salesforce pages and triggers re-extraction
 */

class DOMObserver {
    constructor(callback) {
        this.callback = callback;
        this.observer = null;
        this.debounceTimer = null;
        this.debounceDelay = 1000; // 1 second
    }

    start() {
        if (this.observer) {
            return; // Already observing
        }

        // Find the main content area
        const targetNode = document.querySelector(
            '.slds-template__container, ' +
            '.oneConsoleTabContainer, ' +
            'main, ' +
            '#content'
        ) || document.body;

        const config = {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        };

        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });

        this.observer.observe(targetNode, config);
        console.log('[SF Extractor] DOM observer started');
    }

    handleMutations(mutations) {
        // Debounce rapid changes
        clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(() => {
            // Check if significant changes occurred
            const hasSignificantChange = mutations.some(mutation => {
                // Look for table updates, list updates, or record changes
                const target = mutation.target;

                if (target.nodeType !== Node.ELEMENT_NODE) {
                    return false;
                }

                const element = target;
                return element.matches('table, tbody, .slds-table, .record-detail, .kanban-board') ||
                    element.closest('table, .slds-table, .record-detail, .kanban-board');
            });

            if (hasSignificantChange) {
                console.log('[SF Extractor] Significant DOM change detected');
                this.callback();
            }
        }, this.debounceDelay);
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            console.log('[SF Extractor] DOM observer stopped');
        }
    }
}

export default DOMObserver;
