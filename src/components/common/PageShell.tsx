import React from 'react';
import { useNavigate } from 'react-router-dom';
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
 * 0.36.0 — the head sits in ONE frame on every page. Pages used to centre
 * themselves at their own width, so the title jumped sideways from page to page
 * (players at 896 px centred, history at 1152 px, stats at 1280 px). Now the
 * frame is always the same; `width` only limits the body, which starts flush
 * under the title. Back, title and actions share one row.
 *
 * The width scale is deliberately short. Four named steps that a reviewer can
 * hold in their head beat five ad-hoc `max-w-*` values that drift apart:
 *
 *   sm  672px  forms, single-column dialogs-as-pages
 *   md  896px  reading width: settings, legal text
 *   lg 1152px  lists, card grids and overviews — also the frame of every page
 *   xl 1280px  wide tables (widens the frame too)
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
  /** Body width. See the scale above. */
  width?: PageWidth;
  /**
   * Show the back button. Pages that the navigation bar/rail leads to pass
   * `false` — the bar is their way back.
   */
  back?: boolean;
  /** Defaults to the app home. */
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
  width = 'lg',
  back = true,
  onBack,
  backLabel,
  actions,
  className = '',
  children,
}) => {
  const navigate = useNavigate();
  const hasHead = back || title || actions;
  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh overflow-x-hidden">
      <div className={`${width === 'xl' ? 'max-w-7xl' : 'max-w-6xl'} mx-auto m3-view`} data-page-frame>
        {hasHead && (
          // A grid, not a flex row: the title line is always the first row, so
          // a subtitle (second row) can never push the title up. The title sits
          // at the same height on every page (0.36.0, pinned by page-frame.spec).
          <header
            className="grid items-center gap-x-3 gap-y-1 mb-6"
            style={{ gridTemplateColumns: `${back ? 'auto ' : ''}minmax(0, 1fr)${actions ? ' auto' : ''}` }}
            data-page-header
          >
            {back && (
              <BackButton inline compact onClick={onBack ?? (() => navigate('/'))} label={backLabel} />
            )}
            <div className="flex items-center gap-3 min-w-0 min-h-12">
              {icon && (
                <span className="w-12 h-12 rounded-m3-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                  {icon}
                </span>
              )}
              {title && <h1 className="m3-headline-medium text-on-surface truncate" data-page-title>{title}</h1>}
            </div>
            {actions && <div className="flex items-center gap-2 justify-self-end">{actions}</div>}
            {subtitle && (
              <p
                className={`m3-body-medium text-on-surface-variant ${back ? 'col-start-2' : 'col-start-1'} ${icon ? 'pl-[3.75rem]' : ''}`}
              >
                {subtitle}
              </p>
            )}
          </header>
        )}

        <div className={`${WIDTH[width]} ${className}`}>{children}</div>
      </div>
    </div>
  );
};

export default PageShell;
