require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

async function testBrevo() {
  console.log('🔍 Testing Brevo Email Configuration...');
  console.log('API Key length:', (process.env.BREVO_API_KEY || '').length);
  console.log('Sender Email:', process.env.BREVO_FROM_EMAIL);

  if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is not set in .env');
    return;
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  const apiInstance = new SibApiV3Sdk.AccountApi();
  try {
    const data = await apiInstance.getAccount();
    console.log('✅ Brevo Authentication SUCCESSFUL!');
    console.log('Account Email:', data.email);
    console.log('Company:', data.companyName);
    console.log('Plan:', data.plan);
  } catch (error) {
    console.error('\n❌ Brevo Authentication FAILED:');
    if (error.response && error.response.text) {
      console.error(error.response.text);
    } else {
      console.error(error.message);
    }
  }
}

testBrevo();
