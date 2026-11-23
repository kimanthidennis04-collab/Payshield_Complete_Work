const API_BASE = '/api';

async function apiCall(endpoint, method = 'GET', data = null) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    // Handle 401 unauthorized gracefully
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('organization');
      window.location.href = '/login';
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Request failed');
      }
      return result;
    } else {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || 'Request failed');
      }
      return text;
    }
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return null;
  }
  return token;
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function getOrganization() {
  const org = localStorage.getItem('organization');
  return org ? JSON.parse(org) : null;
}

function formatCurrency(amount, currency = null) {
  const org = getOrganization();
  const cur = currency || (org ? org.currency : 'USD');
  const num = Number(amount) || 0;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    }).format(num);
  } catch (e) {
    return `${cur} ${num.toFixed(2)}`;
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('organization');
  window.location.href = '/login';
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Modern Unified SaaS Shell Injector
function initAppShell(activeKey) {
  checkAuth();
  const user = getUser() || { name: 'User', role: 'Staff' };
  const org = getOrganization() || { name: 'PayShield Business', currency: 'USD' };

  // Set sidebar HTML if placeholder exists
  const sidebarEl = document.getElementById('appSidebar');
  if (sidebarEl) {
    sidebarEl.className = 'app-sidebar';
    sidebarEl.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo-icon">🛡️</div>
        <div>
          <div class="sidebar-brand-name">PayShield</div>
          <div class="sidebar-brand-sub">Financial Protection</div>
        </div>
      </div>

      <div class="org-profile-badge">
        <div>
          <div class="org-name-text" title="${org.name}">${org.name}</div>
          <div style="font-size: 0.68rem; color: #94a3b8;">Active Workspace</div>
        </div>
        <span class="org-curr-pill">${org.currency}</span>
      </div>

      <ul class="sidebar-menu">
        <li class="nav-section-label">Overview</li>
        <li class="sidebar-menu-item"><a href="/dashboard" class="${activeKey === 'dashboard' ? 'active' : ''}">📊 Dashboard</a></li>
        <li class="sidebar-menu-item"><a href="/cashflow" class="${activeKey === 'cashflow' ? 'active' : ''}">📈 Cash Flow</a></li>
        <li class="sidebar-menu-item"><a href="/reports" class="${activeKey === 'reports' ? 'active' : ''}">📑 Reports</a></li>
        <li class="sidebar-menu-item"><a href="/insights" class="${activeKey === 'insights' ? 'active' : ''}">💡 Financial Insights</a></li>

        <li class="nav-section-label">Operations</li>
        <li class="sidebar-menu-item"><a href="/clients" class="${activeKey === 'clients' ? 'active' : ''}">👥 Clients</a></li>
        <li class="sidebar-menu-item"><a href="/services" class="${activeKey === 'services' ? 'active' : ''}">💼 Services</a></li>
        <li class="sidebar-menu-item"><a href="/quotes" class="${activeKey === 'quotes' ? 'active' : ''}">📝 Quotations</a></li>
        <li class="sidebar-menu-item"><a href="/invoices" class="${activeKey === 'invoices' ? 'active' : ''}">🧾 Invoices</a></li>
        <li class="sidebar-menu-item"><a href="/payments" class="${activeKey === 'payments' ? 'active' : ''}">💳 Payments</a></li>
        <li class="sidebar-menu-item"><a href="/transactions" class="${activeKey === 'transactions' ? 'active' : ''}">📑 Transactions</a></li>
        <li class="sidebar-menu-item"><a href="/expenses" class="${activeKey === 'expenses' ? 'active' : ''}">📉 Expenses</a></li>

        <li class="nav-section-label">Protection Engine</li>
        <li class="sidebar-menu-item"><a href="/deliverables" class="${activeKey === 'deliverables' ? 'active' : ''}">🔒 Deliverable Shield</a></li>
        <li class="sidebar-menu-item"><a href="/reminders" class="${activeKey === 'reminders' ? 'active' : ''}">⏰ Payment Reminders</a></li>

        <li class="nav-section-label">Account</li>
        <li class="sidebar-menu-item"><a href="/settings" class="${activeKey === 'settings' ? 'active' : ''}">⚙️ Settings</a></li>
      </ul>

      <div class="sidebar-footer">
        <div class="user-snippet">
          <span class="user-snippet-name">${user.name}</span>
          <span class="user-snippet-role">${user.role}</span>
        </div>
        <button onclick="logout()" class="btn btn-outline btn-sm" style="color: #94a3b8; border-color: rgba(255,255,255,0.15);" title="Sign out">Exit</button>
      </div>
    `;
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('appSidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}
