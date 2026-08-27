import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  Button, IconButton, Fab, Card, TextField, Switch, Chip, Dialog, BackButton, PageShell,
} from '../../components/common';

/**
 * Contract tests for the M3 primitive library.
 *
 * These are deliberately about *contract*, not appearance: that a variant
 * reaches the DOM as a class, that disabled really blocks the handler, that
 * labels are wired for assistive tech. Screenshot-level styling is not pinned
 * here — it would break on every design tweak without catching real defects.
 */
describe('Button', () => {
  it('renders its label and fires on click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Speichern</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('carries the M3 base class and its variant', () => {
    render(<Button variant="danger">Löschen</Button>);
    const b = screen.getByRole('button');
    expect(b.className).toContain('m3-button');
    expect(b.className).toContain('m3-danger');
  });

  it('a disabled button does not fire', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Nope</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  /** A pending action must not be submittable twice. */
  it('loading disables the button', () => {
    render(<Button loading>Senden</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('IconButton', () => {
  it('requires a label and exposes it as the accessible name', () => {
    render(<IconButton label="Schließen"><span /></IconButton>);
    expect(screen.getByRole('button', { name: 'Schließen' })).toBeInTheDocument();
  });
});

describe('Fab', () => {
  it('renders an extended FAB with its label', () => {
    render(<Fab icon={<span />} label="Neues Spiel" />);
    expect(screen.getByRole('button', { name: /Neues Spiel/ })).toBeInTheDocument();
  });
});

describe('Card', () => {
  it('applies the requested variant', () => {
    const { container } = render(<Card variant="elevated">Inhalt</Card>);
    const el = container.firstElementChild!;
    expect(el.className).toContain('m3-card');
    expect(el.className).toContain('m3-elevated');
  });

  it('keeps any className the caller passes', () => {
    const { container } = render(<Card className="p-6">x</Card>);
    expect(container.firstElementChild!.className).toContain('p-6');
  });
});

describe('TextField', () => {
  it('links its label to the input', () => {
    render(<TextField label="Name" />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('marks the field invalid and shows the message on error', () => {
    render(<TextField label="Email" error="Pflichtfeld" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Pflichtfeld')).toBeInTheDocument();
  });

  it('passes the value through as a controlled input', async () => {
    const onChange = vi.fn();
    render(<TextField label="Name" value="Anna" onChange={onChange} />);
    expect(screen.getByLabelText('Name')).toHaveValue('Anna');
  });
});

describe('Switch', () => {
  it('reports its state through role=switch and toggles to the opposite', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Ton" />);
    const sw = screen.getByRole('switch', { name: 'Ton' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles back off when it is already on', async () => {
    const onChange = vi.fn();
    render(<Switch checked onChange={onChange} label="Ton" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('a disabled switch does not toggle', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} disabled label="Ton" />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Chip', () => {
  it('reports selection through aria-pressed', () => {
    const { rerender } = render(<Chip>Alle</Chip>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    rerender(<Chip selected>Alle</Chip>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(<Dialog open={false} onClose={vi.fn()} title="Titel">Inhalt</Dialog>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a modal dialog with its title and content when open', () => {
    render(<Dialog open onClose={vi.fn()} title="Titel">Inhalt</Dialog>);
    const d = screen.getByRole('dialog');
    expect(d).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Titel')).toBeInTheDocument();
    expect(screen.getByText('Inhalt')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Titel">Inhalt</Dialog>);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('hideClose removes the close button', () => {
    render(<Dialog open onClose={vi.fn()} title="Titel" hideClose>Inhalt</Dialog>);
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
  });
});

describe('BackButton', () => {
  it('is a labelled button that calls its handler', async () => {
    const onClick = vi.fn();
    render(<MemoryRouter><BackButton onClick={onClick} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('takes a custom label', () => {
    render(<MemoryRouter><BackButton onClick={vi.fn()} label="Zum Menü" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Zum Menü/ })).toBeInTheDocument();
  });
});

describe('PageShell', () => {
  it('renders the title as the single h1 of the screen', () => {
    render(<MemoryRouter><PageShell title="Spieler">x</PageShell></MemoryRouter>);
    const h1 = screen.getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent('Spieler');
  });

  /** The heading level 14 of 27 screens had already converged on. */
  it('uses the house heading level', () => {
    render(<MemoryRouter><PageShell title="Spieler">x</PageShell></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('m3-headline-medium');
  });

  it.each([
    ['sm', 'max-w-2xl'],
    ['md', 'max-w-4xl'],
    ['lg', 'max-w-6xl'],
    ['xl', 'max-w-7xl'],
  ] as const)('width "%s" maps to %s', (width, cls) => {
    const { container } = render(
      <MemoryRouter><PageShell title="T" width={width}>x</PageShell></MemoryRouter>
    );
    expect(container.querySelector(`.${cls}`)).toBeTruthy();
  });

  it('back={false} omits the back button', () => {
    render(<MemoryRouter><PageShell title="T" back={false}>x</PageShell></MemoryRouter>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders subtitle and actions when given', () => {
    render(
      <MemoryRouter>
        <PageShell title="T" subtitle="Untertitel" actions={<button>Aktion</button>}>x</PageShell>
      </MemoryRouter>
    );
    expect(screen.getByText('Untertitel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aktion' })).toBeInTheDocument();
  });
});
