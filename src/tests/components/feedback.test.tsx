import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n/config';
import { FeedbackProvider } from '../../components/common/Feedback';
import { useFeedback } from '../../components/common/feedbackContext';

let api: ReturnType<typeof useFeedback>;
const Grab = () => {
  // eslint-disable-next-line react-hooks/globals -- the probe hands the API to the test
  api = useFeedback();
  return null;
};
const mount = () => render(<FeedbackProvider><Grab /></FeedbackProvider>);

describe('Feedback', () => {
  it('notify shows an announced snackbar', async () => {
    mount();
    React.act(() => api.notify('Gespeichert'));
    expect(await screen.findByRole('status')).toHaveTextContent('Gespeichert');
  });

  it('confirm resolves true on the confirm button', async () => {
    mount();
    let answer: Promise<boolean>;
    React.act(() => { answer = api.confirm({ title: 'Spieler löschen?', confirmLabel: 'Löschen', danger: true }); });
    expect(await screen.findByRole('dialog', { name: 'Spieler löschen?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    await expect(answer!).resolves.toBe(true);
  });

  it('confirm resolves false on cancel and on Escape', async () => {
    mount();
    let first: Promise<boolean>;
    React.act(() => { first = api.confirm({ title: 'A?' }); });
    fireEvent.click(await screen.findByRole('button', { name: /abbrechen|cancel/i }));
    await expect(first!).resolves.toBe(false);

    let second: Promise<boolean>;
    React.act(() => { second = api.confirm({ title: 'B?' }); });
    await screen.findByRole('dialog', { name: 'B?' });
    fireEvent.keyDown(document, { key: 'Escape' });
    await expect(second!).resolves.toBe(false);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('a second confirm cancels an unanswered first one instead of leaving it hanging', async () => {
    mount();
    let first: Promise<boolean>;
    React.act(() => { first = api.confirm({ title: 'A?' }); });
    React.act(() => { api.confirm({ title: 'B?' }); });
    await expect(first!).resolves.toBe(false);
  });
});
