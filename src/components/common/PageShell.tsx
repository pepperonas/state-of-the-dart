import React from 'react';
import BackButton from './BackButton';

/**
 * One page frame for the whole app.
 *
 * Before this, every screen built its own head by hand, and the audit found the
 * result: eight different container widths (several pages using two of them at
 * once), four different heading levels for the page title, and seven screens
 * with no way back at all. `PageShell` is the fix — a page states *what* it is,
 * not how wide it should be.
 *
 * The width scale is deliberately short. Four named steps that a reviewer can
 * hold in their head beat five ad-hoc `max-w-*` values that drift apart:
 *
 *   sm  672px  forms, single-column dialogs-as-pages
 *   md  896px  the default for content screens
 *   lg 1152px  card grids and overviews
 *   xl 1280px  wide tables and the in-game board
 *
 * The heading is always `m3-headline-medium` — the level 14 of 27 screens had
 * already converged on before this component existed.
 */

export type PageWidth = 'sm' | 'md' | 'lg' | 'xl';

const WIDTH: Record<PageWidth, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
};

interface PageShellProps {
  /** Page title. Rendered as the single `<h1>` of the screen. */
  title?: React.ReactNode;
  /** One line under the title. */
  subtitle?: React.ReactNode;
  /** Icon tile left of the title. */
  icon?: React.ReactNode;
  /** Content width. See the scale above. */
  width?: PageWidth;
  /** Show the back button. Omit `onBack` to fall back to the app home. */
  back?: boolean;
  onBack?: () => void;
  backLabel?: string;
  /** Controls on the right of the title row. */
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle,
  icon,
  width = 'md',
  back = true,
  onBack,
  backLabel,
  actions,
  className = '',
  children,
}) => (
  <div className="min-h-dvh p-4 md:p-8 gradient-mesh overflow-x-hidden">
    <div className={`${WIDTH[width]} mx-auto m3-view ${className}`}>
      {back && (
        <BackButton
          onClick={onBack ?? (() => { window.location.href = '/'; })}
          label={backLabel}
        />
      )}

      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span className="w-12 h-12 rounded-m3-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h1 className="m3-headline-medium text-on-surface truncate">{title}</h1>}
              {subtitle && <p className="m3-body-medium text-on-surface-variant">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      {children}
    </div>
  </div>
);

export default PageShell;
