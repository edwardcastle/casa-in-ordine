'use server';

export async function submitContactForm(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const service = formData.get('service') as string;
  const message = formData.get('message') as string;

  // Validate required fields
  if (!name || !email || !message) {
    return { success: false, error: 'Missing required fields' };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email address' };
  }

  // In production, you would send an email or save to a database here
  console.log('Contact form submission:', { name, email, phone, service, message });

  // Simulate a slight delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return { success: true };
}
