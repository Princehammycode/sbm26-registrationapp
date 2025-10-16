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
    showErrorModal('Please fill in all required fields');
    return;
  }

  // Validate name (alphabets and spaces only)
  const nameValidation = validateName(formData.name);
  if (!nameValidation.valid) {
    showErrorModal(nameValidation.message);
    return;
  }

  // Validate phone number with specific rules
  const phoneValidation = validatePhoneNumber(formData.contact);
  if (!phoneValidation.valid) {
    showErrorModal(phoneValidation.message);
    return;
  }

  // Validate email if provided (more strict validation)
  if (formData.email && !isValidEmail(formData.email)) {
    showErrorModal('Please enter a valid email address (e.g., name@example.com)');
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

// Validate name (alphabets and spaces only)
function validateName(name) {
  // Remove extra spaces
  const cleanName = name.trim();
  
  // Check if name is empty
  if (cleanName.length === 0) {
    return {
      valid: false,
      message: 'Name is required'
    };
  }
  
  // Check if name is too short
  if (cleanName.length < 2) {
    return {
      valid: false,
      message: 'Name must be at least 2 characters long'
    };
  }
  
  // Check if name contains only letters and spaces
  // Allows: A-Z, a-z, spaces, hyphens, apostrophes (for names like O'Brien, Mary-Jane)
  const nameRegex = /^[A-Za-z\s'-]+$/;
  
  if (!nameRegex.test(cleanName)) {
    return {
      valid: false,
      message: 'Name must contain only letters and spaces (no numbers or symbols)'
    };
  }
  
  // Check if name has at least one letter (not just spaces)
  if (!/[A-Za-z]/.test(cleanName)) {
    return {
      valid: false,
      message: 'Name must contain at least one letter'
    };
  }
  
  return { valid: true };
}

// Validate phone number with Ghana-specific rules
function validatePhoneNumber(phone) {
  // Remove any spaces or dashes
  const cleanPhone = phone.replace(/[\s\-]/g, '');
  
  // Check if phone contains only digits
  if (!/^\d+$/.test(cleanPhone)) {
    return {
      valid: false,
      message: 'Phone number must contain only digits'
    };
  }
  
  // If starts with 0 (local format): must be exactly 10 digits
  if (cleanPhone.startsWith('0')) {
    if (cleanPhone.length !== 10) {
      return {
        valid: false,
        message: 'Phone number starting with 0 must be exactly 10 digits (e.g., 0244123456)'
      };
    }
    
    // Check if second digit is valid (2, 5, or 3 for Ghana)
    const secondDigit = cleanPhone[1];
    if (!['2', '3', '5'].includes(secondDigit)) {
      return {
        valid: false,
        message: 'Invalid phone number format. Must start with 024, 025, 020, 050, 054, 055, 059, 030, etc.'
      };
    }
    
    return { valid: true };
  }
  
  // If starts with 233 (international format): must be exactly 12 digits
  if (cleanPhone.startsWith('233')) {
    if (cleanPhone.length !== 12) {
      return {
        valid: false,
        message: 'Phone number starting with 233 must be exactly 12 digits (e.g., 233244123456)'
      };
    }
    
    // Check if fourth digit is valid (2, 5, or 3 for Ghana)
    const fourthDigit = cleanPhone[3];
    if (!['2', '3', '5'].includes(fourthDigit)) {
      return {
        valid: false,
        message: 'Invalid phone number format. Must be 233244..., 233554..., etc.'
      };
    }
    
    return { valid: true };
  }
  
  // If doesn't start with 0 or 233
  return {
    valid: false,
    message: 'Phone number must start with 0 (10 digits) or 233 (12 digits)'
  };
}

// Validate email with strict rules
function isValidEmail(email) {
  // More comprehensive email validation
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // Additional checks
  if (email.length > 254) return false; // Max email length
  if (email.startsWith('.') || email.endsWith('.')) return false;
  if (email.includes('..')) return false; // No consecutive dots
  
  return true;
}

// Prevent closing modal by clicking outside - force user to click OK
// window.onclick = function(event) {
//   if (event.target === successModal) {
//     closeModal();
//   }
// }

// Real-time name validation
const nameInput = document.getElementById('name');
const nameHelper = document.getElementById('nameHelper');

nameInput.addEventListener('input', function(e) {
  const name = this.value;
  
  if (name.length === 0) {
    nameHelper.textContent = 'Enter your full name (letters only)';
    nameHelper.style.color = '#666';
    this.style.borderColor = '';
    return;
  }
  
  const validation = validateName(name);
  
  if (validation.valid) {
    nameHelper.textContent = '✓ Valid name';
    nameHelper.style.color = '#28a745';
    this.style.borderColor = '#28a745';
  } else {
    nameHelper.textContent = validation.message;
    nameHelper.style.color = '#dc3545';
    this.style.borderColor = '#dc3545';
  }
});

// Real-time phone number validation
const contactInput = document.getElementById('contact');
const phoneHelper = document.getElementById('phoneHelper');

contactInput.addEventListener('input', function(e) {
  // Remove non-numeric characters
  this.value = this.value.replace(/[^0-9]/g, '');
  
  // Real-time validation feedback
  const phone = this.value;
  
  if (phone.length === 0) {
    phoneHelper.textContent = 'Format: 0XXXXXXXXX (10 digits) or 233XXXXXXXXXX (12 digits)';
    phoneHelper.style.color = '#666';
    this.style.borderColor = '';
    return;
  }
  
  const validation = validatePhoneNumber(phone);
  
  if (validation.valid) {
    phoneHelper.textContent = '✓ Valid phone number';
    phoneHelper.style.color = '#28a745';
    this.style.borderColor = '#28a745';
  } else {
    phoneHelper.textContent = validation.message;
    phoneHelper.style.color = '#dc3545';
    this.style.borderColor = '#dc3545';
  }
});

// Real-time email validation
const emailInput = document.getElementById('email');
const emailHelper = document.getElementById('emailHelper');

emailInput.addEventListener('input', function(e) {
  const email = this.value.trim();
  
  if (email.length === 0) {
    emailHelper.textContent = 'Enter a valid email address';
    emailHelper.style.color = '#666';
    this.style.borderColor = '';
    return;
  }
  
  if (isValidEmail(email)) {
    emailHelper.textContent = '✓ Valid email address';
    emailHelper.style.color = '#28a745';
    this.style.borderColor = '#28a745';
  } else {
    emailHelper.textContent = '✗ Invalid email format';
    emailHelper.style.color = '#dc3545';
    this.style.borderColor = '#dc3545';
  }
});
