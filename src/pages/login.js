import { requireGuest, completeLoginAuthReturn, signIn, signUp } from '../core/auth.js';
import { q, show, hide, setText, revealPage } from '../core/ui.js';

export async function initLogin() {
  const completedAuthReturn = await completeLoginAuthReturn();
  if (!completedAuthReturn) await requireGuest();

  const signinSection = q('[wized="signin-section"]');
  const signupSection = q('[wized="signup-section"]');

  if (!signinSection || !signupSection) {
    console.warn('ICIT login page is missing signin/signup section wized attributes.');
    revealPage();
    return;
  }

  // Default: show sign-in, hide sign-up
  show(signinSection);
  signinSection.classList.remove('auth-form-hidden');
  hide(signupSection);
  signupSection.classList.add('auth-form-hidden');

  hide(q('[wized="signin-error-msg"]'));
  hide(q('[wized="signin-loading"]'));
  hide(q('[wized="signup-error-msg"]'));
  hide(q('[wized="signup-loading"]'));

  if (completedAuthReturn) {
    setText(q('[wized="signin-error-msg"]'), 'Email confirmed. Please sign in.');
    show(q('[wized="signin-error-msg"]'));
  }

  revealPage();

  const gotoSignup = q('[wized="goto-signup"]');
  if (gotoSignup) gotoSignup.addEventListener('click', (e) => {
    e.preventDefault();
    hide(signinSection);
    signinSection.classList.add('auth-form-hidden');
    show(signupSection);
    signupSection.classList.remove('auth-form-hidden');
  });

  const gotoSignin = q('[wized="goto-signin"]');
  if (gotoSignin) gotoSignin.addEventListener('click', (e) => {
    e.preventDefault();
    hide(signupSection);
    signupSection.classList.add('auth-form-hidden');
    show(signinSection);
    signinSection.classList.remove('auth-form-hidden');
  });

  const signinSubmitEl = q('[wized="signin-submit"]');
  if (signinSubmitEl) signinSubmitEl.addEventListener('click', async (e) => {
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

  const signupSubmitEl = q('[wized="signup-submit"]');
  if (signupSubmitEl) signupSubmitEl.addEventListener('click', async (e) => {
    e.preventDefault();
    hide(q('[wized="signup-error-msg"]'));
    const password = q('[wized="signup-password"]').value;
    const confirmEl = q('[wized="signup-confirm-password"]');
    if (confirmEl && confirmEl.value !== password) {
      setText(q('[wized="signup-error-msg"]'), 'Passwords do not match. Please try again.');
      show(q('[wized="signup-error-msg"]'));
      return;
    }
    show(q('[wized="signup-loading"]'));
    try {
      const session = await signUp(
        q('[wized="signup-email"]').value.trim(),
        password,
        q('[wized="signup-first-name"]').value.trim(),
        q('[wized="signup-last-name"]').value.trim(),
      );
      if (session) {
        window.location.href = '/dashboard';
      } else {
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
