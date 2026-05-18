import { describe, it, expect } from 'vitest';
import { statusToVariant } from '../statusUtils';

describe('statusToVariant', () => {
  it('maps draft to draft', () => {
    expect(statusToVariant('draft')).toBe('draft');
  });

  it('maps submitted to pending', () => {
    expect(statusToVariant('submitted')).toBe('pending');
  });

  it('maps in_review to pending', () => {
    expect(statusToVariant('in_review')).toBe('pending');
  });

  it('maps waitlisted to waitlisted', () => {
    expect(statusToVariant('waitlisted')).toBe('waitlisted');
  });

  it('maps accepted to approved', () => {
    expect(statusToVariant('accepted')).toBe('approved');
  });

  it('maps enrolled to approved', () => {
    expect(statusToVariant('enrolled')).toBe('approved');
  });

  it('maps rejected to rejected', () => {
    expect(statusToVariant('rejected')).toBe('rejected');
  });

  it('maps withdrawn to rejected', () => {
    expect(statusToVariant('withdrawn')).toBe('rejected');
  });
});
