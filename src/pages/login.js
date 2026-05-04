import { requireGuest, completeLoginAuthReturn, signIn, signUp } from '../core/auth.js';
import { q, show, hide, setText, revealPage } from '../core/ui.js';

export async function initLogin() {
  const completedAuthReturn = await completeLoginAuthReturn();
  if (!completedAuthReturn) await requireGuest(); // redirect to /dashboard if already signed in

  if (!q('[wized="tab-signin"]') || !q('[wized="signin-submit"]') || !q('[wized="signup-submit"]')) {
    console.warn('ICIT login page is missing one or more required wized attributes.');
    revealPage();
    return;
  }

  const signinSection = q('[wized="signin-section"]');
  const signupSection = q('[wized="signup-section"]');
  if (!signinSection || !signupSection) {
    console.warn('ICIT login page is missing signin/signup section wized attributes.');
    revealPage();
    return;
  }

  // Default state: show sign-in form, hide sign-up form.
  // Must also toggle the Webflow CSS class since show/hide only manage inline styles.
  signinSection.classList.remove('auth-form-hidden');
  show(signinSection);
  signupSection.classList.add('auth-form-hidden');
  hide(signupSection);
  hide(q('[wized="signin-error-msg"]'));
  hide(q('[wized="signin-loading"]'));
  hide(q('[wized="signup-error-msg"]'));
  hide(q('[wized="signup-loading"]'));

  if (completedAuthReturn) {
    setText(q('[wized="signin-error-msg"]'), 'Email confirmed. Please sign in.');
    show(q('[wized="signin-error-msg"]'));
  }

  revealPage();

  q('[wized="tab-signin"]').addEventListener('click', (e) => {
    e.preventDefault();
    signinSection.classList.remove('auth-form-hidden');
    show(signinSection);
    signupSection.classList.add('auth-form-hidden');
    hide(signupSection);
    q('[wized="tab-signin"]').classList.add('auth-tab-active');
    q('[wized="tab-signup"]').classList.remove('auth-tab-active');
  });

  q('[wized="tab-signup"]').addEventListener('click', (e) => {
    e.preventDefault();
    signinSection.classList.add('auth-form-hidden');
    hide(signinSection);
    signupSection.classList.remove('auth-form-hidden');
    show(signupSection);
    q('[wized="tab-signin"]').classList.remove('auth-tab-active');
    q('[wized="tab-signup"]').classList.add('auth-tab-active');
  });

  q('[wized="signin-submit"]').addEventListener('click', async (e) => {
    e.preventDefault();
    hide(q('[wized="signin-error-msg"]'));
    show(q('[wized="signin-loading"]'));
    try {
      await signIn(
        q('[wized="signin-email"]').value.trim(),
        q('[wized="signin-password"]').value,
      );
      window.location.href = '/dashboard';
    } catch (err) {
      hide(q('[wized="signin-loading"]'));
      setText(q('[wized="signin-error-msg"]'), err.message || 'Invalid email or password.');
      show(q('[wized="signin-error-msg"]'));
    }
  });

  q('[wized="signup-submit"]').addEventListener('click', async (e) => {
    e.preventDefault();
    hide(q('[wized="signup-error-msg"]'));
    show(q('[wized="signup-loading"]'));
    try {
      const session = await signUp(
        q('[wized="signup-email"]').value.trim(),
        q('[wized="signup-password"]').value,
        q('[wized="signup-first-name"]').value.trim(),
        q('[wized="signup-last-name"]').value.trim(),
      );
      if (session) {
        window.location.href = '/dashboard';
      } else {
        // Supabase requires email confirmation before issuing a session
        hide(q('[wized="signup-loading"]'));
        setText(q('[wized="signup-error-msg"]'), 'Account created! Check your email to confirm your account, then sign in.');
        show(q('[wized="signup-error-msg"]'));
      }
    } catch (err) {
      hide(q('[wized="signup-loading"]'));
      setText(q('[wized="signup-error-msg"]'), err.message || 'Sign up failed. Please try again.');
      show(q('[wized="signup-error-msg"]'));
    }
  });
}
