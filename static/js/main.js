// Main JavaScript for DCA Platform

class DCAPlatform {
    constructor() {
        this.initEventListeners();
        this.initTooltips();
        this.loadUserPreferences();
    }

    initEventListeners() {
        // Auto-refresh dashboard every 30 seconds
        if (window.location.pathname === '/dashboard') {
            setInterval(() => this.refreshDashboard(), 30000);
        }

        // Initialize all interactive elements
        this.initializeInteractiveElements();
    }

    initializeInteractiveElements() {
        // Initialize data tables
        this.initializeDataTables();
        
        // Initialize modals
        this.initializeModals();
        
        // Initialize search functionality
        this.initializeSearch();
    }

    initializeDataTables() {
        // Example: Initialize case table with sorting and filtering
        const caseTable = document.getElementById('casesTable');
        if (caseTable) {
            // Implementation for datatable initialization
            this.loadCases();
        }
    }

    async loadCases(page = 1, status = 'all') {
        try {
            const response = await fetch(`/api/cases?page=${page}&status=${status}`);
            const data = await response.json();
            
            // Update table with cases
            this.updateCasesTable(data.cases);
            this.updatePagination(data);
        } catch (error) {
            this.showError('Failed to load cases');
        }
    }

    updateCasesTable(cases) {
        const tbody = document.querySelector('#casesTable tbody');
        if (!tbody) return;

        tbody.innerHTML = cases.map(caseItem => `
            <tr data-case-id="${caseItem.id}">
                <td>${caseItem.case_number}</td>
                <td>${caseItem.customer_name}</td>
                <td>$${caseItem.amount_due.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td>${caseItem.days_overdue} days</td>
                <td>${caseItem.agency_name}</td>
                <td>
                    <span class="badge badge-${this.getStatusClass(caseItem.status)}">
                        ${caseItem.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="allocateCaseModal(${caseItem.id})">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="viewCaseDetails(${caseItem.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getStatusClass(status) {
        const statusClasses = {
            'pending': 'secondary',
            'allocated': 'info',
            'active': 'warning',
            'recovered': 'success',
            'closed': 'dark'
        };
        return statusClasses[status] || 'secondary';
    }

    async refreshDashboard() {
        try {
            const response = await fetch('/api/dashboard-stats');
            const data = await response.json();
            
            // Update dashboard stats
            this.updateDashboardStats(data);
            
            // Refresh charts if they exist
            if (window.recoveryChart) {
                this.updateCharts(data);
            }
        } catch (error) {
            console.error('Failed to refresh dashboard:', error);
        }
    }

    updateDashboardStats(stats) {
        // Update all stat cards
        document.querySelectorAll('.stat-card').forEach(card => {
            const metric = card.dataset.metric;
            if (stats[metric]) {
                const valueElement = card.querySelector('.card-title');
                if (valueElement) {
                    valueElement.textContent = this.formatValue(metric, stats[metric]);
                }
            }
        });
    }

    formatValue(metric, value) {
        switch (metric) {
            case 'total_cases':
            case 'active_cases':
                return value.toLocaleString();
            case 'recovered_amount':
            case 'pending_amount':
                return `$${value.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
            case 'recovery_rate':
                return `${value.toFixed(1)}%`;
            default:
                return value;
        }
    }

    async allocateCase(caseId, agencyId) {
        try {
            const response = await fetch('/api/allocate-case', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    case_id: caseId,
                    agency_id: agencyId
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Case Allocated', 'Case has been successfully allocated to agency', 'success');
                this.loadCases(); // Refresh cases
            } else {
                this.showNotification('Allocation Failed', result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Error', 'Failed to allocate case', 'error');
        }
    }

    async runAIAllocation(batchSize = 50) {
        try {
            this.showLoading('Running AI allocation...');
            
            const response = await fetch('/api/ai-allocate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    batch_size: batchSize
                })
            });

            const result = await response.json();
            this.hideLoading();
            
            if (result.success) {
                this.showNotification(
                    'AI Allocation Complete',
                    `Successfully allocated ${result.allocated} cases using AI`,
                    'success'
                );
                
                // Refresh the page after 2 seconds
                setTimeout(() => location.reload(), 2000);
            } else {
                this.showNotification('AI Allocation Failed', result.message, 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Error', 'Failed to run AI allocation', 'error');
        }
    }

    showNotification(title, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <div>
                <strong>${title}</strong>
                <p class="mb-0">${message}</p>
            </div>
            <button class="btn-close" onclick="this.parentElement.remove()"></button>
        `;

        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    showLoading(message = 'Loading...') {
        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">${message}</span>
                </div>
                <p class="mt-3">${message}</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    initTooltips() {
        // Initialize Bootstrap tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    loadUserPreferences() {
        // Load user preferences from localStorage
        const theme = localStorage.getItem('theme') || 'light';
        this.setTheme(theme);
    }

    setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    // Export functionality for reports
    async exportReport(type, format = 'pdf') {
        try {
            const response = await fetch(`/api/export-report?type=${type}&format=${format}`);
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            this.showNotification('Export Failed', 'Failed to generate report', 'error');
        }
    }
}

// Initialize platform when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dcaPlatform = new DCAPlatform();
    
    // Initialize charts if on dashboard
    if (window.location.pathname === '/dashboard') {
        initializeDashboardCharts();
    }
});

// Global functions accessible from HTML
function allocateCaseModal(caseId) {
    // Show agency selection modal
    const modal = new bootstrap.Modal(document.getElementById('agencyModal'));
    document.getElementById('agencyModal').dataset.caseId = caseId;
    modal.show();
}

function confirmAllocation() {
    const modal = document.getElementById('agencyModal');
    const caseId = modal.dataset.caseId;
    const agencyId = document.getElementById('agencySelect').value;
    
    if (agencyId) {
        window.dcaPlatform.allocateCase(caseId, agencyId);
        bootstrap.Modal.getInstance(modal).hide();
    }
}

function viewCaseDetails(caseId) {
    // Navigate to case details page
    window.location.href = `/case/${caseId}`;
}

// Chart initialization
function initializeDashboardCharts() {
    const ctx1 = document.getElementById('recoveryChart');
    const ctx2 = document.getElementById('caseDistributionChart');
    
    if (ctx1) {
        window.recoveryChart = new Chart(ctx1.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Recovery Amount',
                    data: [12000, 19000, 15000, 25000, 22000, 30000],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    if (ctx2) {
        window.distributionChart = new Chart(ctx2.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Recovered', 'Active', 'Pending', 'Closed'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: [
                        '#27ae60',
                        '#f39c12',
                        '#3498db',
                        '#95a5a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%'
            }
        });
    }
}