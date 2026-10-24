
import 'dotenv/config';
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY in backend/.env');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  const { data, error } = await resend.emails.send({
    from: 'FoodLoop <onboarding@resend.dev>',
    to: ['delivered@resend.dev'],
    subject: 'FoodLoop OTP Email Test',
    text: 'FoodLoop email sending is connected successfully.',
    html: '<h2>FoodLoop</h2><p>Email sending is connected successfully.</p>',
  });

  if (error) {
    console.error('Email test failed:', error.message);
    process.exitCode = 1;
    return;
  }

  console.log('Email test accepted by Resend:', data?.id);
}

testEmail().catch((error) => {
  console.error('Email test failed:', error.message);
  process.exitCode = 1;
});
