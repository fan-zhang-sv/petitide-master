import { useState } from 'react';
import { Check, Coffee, Copy, ExternalLink } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { MenuRow } from '../../components/ui/MenuRow';
import { SectionHeader } from '../../components/ui/Header';
import { cx } from '../../utils/ui/classNames';
import styles from '../../styles/app.module.css';

// Set these to your own handles. Leave any value empty to hide that row.
// Venmo / Cash App: omit the leading @ or $.
// Base: paste your 0x… wallet address. baseName is an optional Basename label.
const SUPPORT = {
  venmo: 'felixzhang',
  cashapp: 'felixzhang',
  baseAddress: '',
  baseName: 'felixzh.base.eth',
} as const;

function venmoUrl(handle: string) {
  return `https://venmo.com/u/${encodeURIComponent(handle)}`;
}

function cashappUrl(handle: string) {
  return `https://cash.app/$${encodeURIComponent(handle)}`;
}

function baseProfileUrl(name: string) {
  return `https://www.base.org/name/${encodeURIComponent(name)}`;
}

function shortenAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function VenmoBadge() {
  return (
    <span className={styles['support-badge-venmo']} aria-hidden>
      <span>V</span>
    </span>
  );
}

function CashAppBadge() {
  return (
    <span className={styles['support-badge-cashapp']} aria-hidden>
      <span>$</span>
    </span>
  );
}

function BaseBadge() {
  return (
    <span className={styles['support-badge-base']} aria-hidden>
      <svg viewBox="0 0 32 32" focusable="false">
        <circle cx="16" cy="16" r="16" fill="#0052FF" />
        <path
          d="M15.5 25.6c5.3 0 9.6-4.3 9.6-9.6 0-5.3-4.3-9.6-9.6-9.6-5 0-9.2 3.9-9.6 8.8h12.7v1.6H5.9c.4 4.9 4.5 8.8 9.6 8.8z"
          fill="#fff"
        />
      </svg>
    </span>
  );
}

export function SupportSection() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const hasVenmo = SUPPORT.venmo.length > 0;
  const hasCashapp = SUPPORT.cashapp.length > 0;
  const hasBase = SUPPORT.baseAddress.length > 0 || SUPPORT.baseName.length > 0;

  if (!hasVenmo && !hasCashapp && !hasBase) return null;

  const flashCopied = (key: string) => {
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 1800);
  };

  const copy = async (key: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      flashCopied(key);
    } catch {
      /* clipboard unavailable — leave silent rather than alert */
    }
  };

  const baseLabel = SUPPORT.baseName || (SUPPORT.baseAddress ? shortenAddress(SUPPORT.baseAddress) : '');
  const baseCopyValue = SUPPORT.baseAddress || SUPPORT.baseName;
  const baseCopied = copiedKey === 'base';

  return (
    <Card
      variant="panel"
      className={cx(styles['settings-panel'], styles['settings-card-full'])}
    >
      <SectionHeader
        title="Buy me a coffee"
        actions={<Coffee aria-hidden className={styles['settings-heading-icon']} />}
      />

      <Card variant="info">
        <Coffee aria-hidden className={styles['info-icon']} />
        <div>
          <strong>If Petitide saves you time</strong>
          <p>A small tip keeps development moving. Pick whichever&apos;s easiest.</p>
        </div>
      </Card>

      <div className={styles.stack}>
        {hasVenmo && (
          <MenuRow
            icon={<VenmoBadge />}
            title="Venmo"
            description={`@${SUPPORT.venmo}`}
            trailing={<ExternalLink aria-hidden className={styles['menu-chevron']} />}
            onClick={() => openExternal(venmoUrl(SUPPORT.venmo))}
          />
        )}
        {hasCashapp && (
          <MenuRow
            icon={<CashAppBadge />}
            title="Cash App"
            description={`$${SUPPORT.cashapp}`}
            trailing={<ExternalLink aria-hidden className={styles['menu-chevron']} />}
            onClick={() => openExternal(cashappUrl(SUPPORT.cashapp))}
          />
        )}
        {hasBase && (
          <MenuRow
            icon={<BaseBadge />}
            title="Base"
            description={
              <span className={styles['support-base-description']}>
                <span className={styles['support-base-label']}>{baseLabel}</span>
                <span
                  className={cx(
                    styles['support-base-hint'],
                    baseCopied ? styles.copied : undefined,
                  )}
                >
                  {baseCopied ? 'Copied — paste in Base App' : 'Tap to copy'}
                </span>
              </span>
            }
            trailing={
              baseCopied ? (
                <Check aria-hidden className={styles['menu-chevron']} />
              ) : (
                <Copy aria-hidden className={styles['menu-chevron']} />
              )
            }
            onClick={() => void copy('base', baseCopyValue)}
          />
        )}
        {hasBase && SUPPORT.baseName && (
          <button
            type="button"
            className={styles['support-base-link']}
            onClick={() => openExternal(baseProfileUrl(SUPPORT.baseName))}
          >
            View profile on base.org
            <ExternalLink aria-hidden />
          </button>
        )}
      </div>
    </Card>
  );
}
