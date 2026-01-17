/**
 * Object Detector - Detects Salesforce object type and view type
 */

export const OBJECT_TYPES = {
    LEAD: 'leads',
    CONTACT: 'contacts',
    ACCOUNT: 'accounts',
    OPPORTUNITY: 'opportunities',
    TASK: 'tasks',
    UNKNOWN: 'unknown'
};

export const VIEW_TYPES = {
    LIST: 'list',
    DETAIL: 'detail',
    KANBAN: 'kanban',
    UNKNOWN: 'unknown'
};

class ObjectDetector {
    detectObjectType() {
        const url = window.location.href;
        const pathname = window.location.pathname;

        // Check URL patterns
        if (url.includes('/Lead/') || pathname.includes('/o/Lead/')) {
            return OBJECT_TYPES.LEAD;
        }
        if (url.includes('/Contact/') || pathname.includes('/o/Contact/')) {
            return OBJECT_TYPES.CONTACT;
        }
        if (url.includes('/Account/') || pathname.includes('/o/Account/')) {
            return OBJECT_TYPES.ACCOUNT;
        }
        if (url.includes('/Opportunity/') || pathname.includes('/o/Opportunity/')) {
            return OBJECT_TYPES.OPPORTUNITY;
        }
        if (url.includes('/Task/') || pathname.includes('/o/Task/')) {
            return OBJECT_TYPES.TASK;
        }

        // Check page title
        const title = document.title.toLowerCase();
        if (title.includes('lead')) return OBJECT_TYPES.LEAD;
        if (title.includes('contact')) return OBJECT_TYPES.CONTACT;
        if (title.includes('account')) return OBJECT_TYPES.ACCOUNT;
        if (title.includes('opportunity') || title.includes('pipeline')) {
            return OBJECT_TYPES.OPPORTUNITY;
        }
        if (title.includes('task')) return OBJECT_TYPES.TASK;

        // Check breadcrumbs
        const breadcrumbs = document.querySelector('nav[role="navigation"]');
        if (breadcrumbs) {
            const text = breadcrumbs.textContent.toLowerCase();
            if (text.includes('lead')) return OBJECT_TYPES.LEAD;
            if (text.includes('contact')) return OBJECT_TYPES.CONTACT;
            if (text.includes('account')) return OBJECT_TYPES.ACCOUNT;
            if (text.includes('opportunity')) return OBJECT_TYPES.OPPORTUNITY;
            if (text.includes('task')) return OBJECT_TYPES.TASK;
        }

        return OBJECT_TYPES.UNKNOWN;
    }

    detectViewType() {
        const url = window.location.href;

        // Kanban/Pipeline view
        if (url.includes('/kanban') || url.includes('/pipeline') ||
            document.querySelector('.kanban-board, [class*="kanban"]')) {
            return VIEW_TYPES.KANBAN;
        }

        // List view
        if (url.includes('/list') || document.querySelector('table[role="grid"], .slds-table')) {
            return VIEW_TYPES.LIST;
        }

        // Detail view (record page)
        if (url.match(/\/r\/\w+\/[a-zA-Z0-9]{15,18}\/view/) ||
            document.querySelector('.record-detail, [class*="record"]')) {
            return VIEW_TYPES.DETAIL;
        }

        return VIEW_TYPES.UNKNOWN;
    }

    getRecordIds() {
        const ids = new Set();

        // Extract from URLs in links
        const links = document.querySelectorAll('a[href*="/r/"]');
        links.forEach(link => {
            const match = link.href.match(/\/r\/\w+\/([a-zA-Z0-9]{15,18})/);
            if (match) {
                ids.add(match[1]);
            }
        });

        // Extract from current URL
        const urlMatch = window.location.pathname.match(/\/([a-zA-Z0-9]{15,18})\//);
        if (urlMatch) {
            ids.add(urlMatch[1]);
        }

        return Array.from(ids);
    }

    getPageInfo() {
        return {
            objectType: this.detectObjectType(),
            viewType: this.detectViewType(),
            recordIds: this.getRecordIds(),
            url: window.location.href,
            timestamp: Date.now()
        };
    }

    isExtractionPossible() {
        const info = this.getPageInfo();
        return info.objectType !== OBJECT_TYPES.UNKNOWN &&
            info.viewType !== VIEW_TYPES.UNKNOWN;
    }
}

const objectDetector = new ObjectDetector();
export default objectDetector;
