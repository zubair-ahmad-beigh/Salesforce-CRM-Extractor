/**
 * Shadow DOM Status Indicator
 * Displays extraction status inside Salesforce pages
 */

(function () {
    'use strict';

    class StatusIndicator {
        constructor() {
            this.shadowHost = null;
            this.shadowRoot = null;
            this.init();
        }

        init() {
            // Create shadow host
            this.shadowHost = document.createElement('div');
            this.shadowHost.id = 'sf-extractor-status';

            // Attach shadow DOM
            this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
        :host {
          all: initial;
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .status-container {
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 12px 16px;
          min-width: 200px;
          max-width: 300px;
          display: none;
          align-items: center;
          gap: 10px;
          animation: slideIn 0.3s ease-out;
        }

        .status-container.visible {
          display: flex;
        }

        @keyframes slideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .status-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .status-icon.detecting {
          border: 2px solid #0176d3;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .status-icon.extracting {
          border: 2px solid #0176d3;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .status-icon.success {
          color: #2e844a;
          font-size: 20px;
          font-weight: bold;
        }

        .status-icon.error {
          color: #c23934;
          font-size: 20px;
          font-weight: bold;
        }

        .status-icon.warning {
          color: #ffb75d;
          font-size: 20px;
          font-weight: bold;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .status-message {
          color: #333;
          font-size: 14px;
          line-height: 1.4;
        }

        .status-container.success {
          background: #f0f9f4;
          border-left: 4px solid #2e844a;
        }

        .status-container.error {
          background: #fef5f4;
          border-left: 4px solid #c23934;
        }

        .status-container.warning {
          background: #fef9f4;
          border-left: 4px solid #ffb75d;
        }
      `;

            this.shadowRoot.appendChild(style);

            // Create container
            const container = document.createElement('div');
            container.className = 'status-container';
            container.innerHTML = `
        <div class="status-icon"></div>
        <div class="status-message"></div>
      `;

            this.shadowRoot.appendChild(container);

            // Append to body
            document.body.appendChild(this.shadowHost);

            // Listen for status updates
            window.addEventListener('message', (event) => {
                if (event.source !== window) return;

                if (event.data.type === 'SF_EXTRACTOR_STATUS') {
                    this.show(event.data.message, event.data.statusType);
                } else if (event.data.type === 'SF_EXTRACTOR_HIDE') {
                    this.hide();
                }
            });

            console.log('[Status Indicator] Initialized');
        }

        show(message, type = 'info') {
            const container = this.shadowRoot.querySelector('.status-container');
            const icon = this.shadowRoot.querySelector('.status-icon');
            const messageEl = this.shadowRoot.querySelector('.status-message');

            // Reset classes
            container.className = 'status-container visible';
            icon.className = 'status-icon';

            // Set type-specific styling
            if (type === 'success') {
                container.classList.add('success');
                icon.classList.add('success');
                icon.textContent = '✓';
            } else if (type === 'error') {
                container.classList.add('error');
                icon.classList.add('error');
                icon.textContent = '✗';
            } else if (type === 'warning') {
                container.classList.add('warning');
                icon.classList.add('warning');
                icon.textContent = '⚠';
            } else if (type === 'detecting' || type === 'extracting') {
                icon.classList.add(type);
                icon.textContent = '';
            }

            messageEl.textContent = message;
        }

        hide() {
            const container = this.shadowRoot.querySelector('.status-container');
            container.classList.remove('visible');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new StatusIndicator();
        });
    } else {
        new StatusIndicator();
    }
})();
