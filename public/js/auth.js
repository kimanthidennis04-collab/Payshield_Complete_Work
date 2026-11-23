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

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }

    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

function hideError() {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const result = await apiCall('/auth/login', 'POST', { email, password });

      if (result.success) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('organization', JSON.stringify(result.organization));
        window.location.href = '/dashboard';
      }
    } catch (error) {
      showError(error.message);
    }
  });
}

if (document.getElementById('signupForm')) {
  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const businessName = document.getElementById('businessName').value;
    const country = document.getElementById('country').value || null;
    const currency = document.getElementById('currency').value || 'USD';

    try {
      const result = await apiCall('/auth/signup', 'POST', {
        name,
        email,
        password,
        businessName,
        country,
        currency,
      });

      if (result.success) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('organization', JSON.stringify(result.organization));
        window.location.href = '/dashboard';
      }
    } catch (error) {
      showError(error.message);
    }
  });
}

function showForgotPasswordModal(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

if (document.getElementById('forgotPasswordForm')) {
  let step = 'REQUEST';
  document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById('forgotModalMsg');
    const submitBtn = document.getElementById('forgotSubmitBtn');

    if (step === 'REQUEST') {
      const email = document.getElementById('forgotEmail').value;
      try {
        const res = await apiCall('/auth/forgot-password', 'POST', { email });
        msgDiv.style.display = 'block';
        msgDiv.style.background = '#ecfdf5';
        msgDiv.style.color = '#065f46';
        msgDiv.textContent = res.message;
        
        if (res.resetToken) {
          document.getElementById('resetTokenInput').value = res.resetToken;
        }

        document.getElementById('resetFields').style.display = 'block';
        submitBtn.textContent = 'Save New Password';
        step = 'RESET';
      } catch (err) {
        msgDiv.style.display = 'block';
        msgDiv.style.background = '#fef2f2';
        msgDiv.style.color = '#991b1b';
        msgDiv.textContent = err.message;
      }
    } else {
      const token = document.getElementById('resetTokenInput').value;
      const newPassword = document.getElementById('newPasswordInput').value;

      try {
        const res = await apiCall('/auth/reset-password', 'POST', { token, newPassword });
        closeForgotPasswordModal();
        const successDiv = document.getElementById('success');
        if (successDiv) {
          successDiv.textContent = res.message || 'Password reset! You can now log in.';
          successDiv.style.display = 'block';
        }
      } catch (err) {
        msgDiv.style.display = 'block';
        msgDiv.style.background = '#fef2f2';
        msgDiv.style.color = '#991b1b';
        msgDiv.textContent = err.message;
      }
    }
  });
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('organization');
  window.location.href = '/login';
}

function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
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
