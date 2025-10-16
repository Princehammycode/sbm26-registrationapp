// API_BASE_URL is loaded from config.js

const form = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const messageDiv = document.getElementById('message');
const successModal = document.getElementById('successModal');
const successMessage = document.getElementById('successMessage');
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');

// Form submission handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get form data
  const formData = {
    name: document.getElementById('name').value.trim(),
    contact: document.getElementById('contact').value.trim(),
    email: document.getElementById('email').value.trim(),
    location: document.getElementById('location').value.trim()
  };

  // Validate required fields
  if (!formData.name || !formData.contact) {
    showMessage('Please fill in all required fields', 'error');
    return;
  }

  // Validate phone number
  if (!/^[0-9]{10,15}$/.test(formData.contact)) {
    showMessage('Please enter a valid phone number (10-15 digits)', 'error');
    return;
  }

  // Validate email if provided
  if (formData.email && !isValidEmail(formData.email)) {
    showMessage('Please enter a valid email address', 'error');
    return;
  }

  // Show loading state
  setLoading(true);
  hideMessage();

  try {
    // Submit registration
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      // Show success modal
      let message = `Thank you, ${formData.name}! Your registration is complete.`;
      
      if (formData.email) {
        message += ' A confirmation email with your ticket has been sent to your email.';
      }
      
      message += ' An SMS with your ticket details has been sent to your phone.';
      //message += `\n\nYour Ticket ID: ${data.ticketId}`;

      showSuccessModal(message);
      form.reset(); // Reset form immediately

    } else {
      // Show error modal instead of inline message
      showErrorModal(data.message || 'Registration failed. Please try again.');
    }

  } catch (error) {
    console.error('Registration error:', error);
    showErrorModal('Network error. Please check your connection and try again.');
  } finally {
    setLoading(false);
  }
});

// Helper functions
function setLoading(loading) {
  submitBtn.disabled = loading;
  if (loading) {
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
  } else {
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  }
}

function showMessage(message, type) {
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideMessage();
  }, 5000);
}

function hideMessage() {
  messageDiv.style.display = 'none';
}

function showSuccessModal(message) {
  successMessage.textContent = message;
  successModal.style.display = 'block';
}

function closeModal() {
  successModal.style.display = 'none';
  // Reload page after closing modal
  window.location.reload();
}

function showErrorModal(message) {
  errorMessage.textContent = message;
  errorModal.style.display = 'block';
}

function closeErrorModal() {
  errorModal.style.display = 'none';
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Prevent closing modal by clicking outside - force user to click OK
// window.onclick = function(event) {
//   if (event.target === successModal) {
//     closeModal();
//   }
// }

// Phone number formatting (optional enhancement)
document.getElementById('contact').addEventListener('input', function(e) {
  // Remove non-numeric characters
  this.value = this.value.replace(/[^0-9]/g, '');
});
