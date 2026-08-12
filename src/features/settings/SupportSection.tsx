import { useState } from 'react';
import { Check, Coffee, Copy, ExternalLink } from 'lucide-react';
import { cx } from '../../utils/ui/classNames';
import styles from '../../styles/app.module.css';

// Set these to your own handles. Leave any value empty to hide that row.
// Venmo / Cash App: omit the leading @ or $.
// Base: paste your 0x… wallet address. baseName is an optional Basename label.
const SUPPORT = {
  venmo: 'felix_zhang',
  cashapp: 'felixzhang997',
  baseAddress: '0x9A9b8F6bd58B03fE2098FC4C40CA4F8020649267',
  baseName: 'felixzh.base.eth',
} as const;

function venmoUrl(handle: string) {
  return `https://venmo.com/u/${encodeURIComponent(handle)}`;
}

function cashappUrl(handle: string) {
  return `https://cash.app/$${encodeURIComponent(handle)}`;
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
    <div className={cx(styles['support-badge'], styles['venmo'])} aria-hidden>
      <span>V</span>
    </div>
  );
}

function CashAppBadge() {
  return (
    <div className={cx(styles['support-badge'], styles['cashapp'])} aria-hidden>
      <span>$</span>
    </div>
  );
}

function BaseBadge() {
  return (
    <div className={cx(styles['support-badge'], styles['base'])} aria-hidden>
      <svg viewBox="0 0 32 32" focusable="false">
        <path
          d="M15.5 25.6c5.3 0 9.6-4.3 9.6-9.6 0-5.3-4.3-9.6-9.6-9.6-5 0-9.2 3.9-9.6 8.8h12.7v1.6H5.9c.4 4.9 4.5 8.8 9.6 8.8z"
          fill="#fff"
        />
      </svg>
    </div>
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
    <>
      <div className={styles['bento-header-group']}>
        <div>
          <h2>Buy me a coffee</h2>
          <span>Support the developer</span>
        </div>
        <Coffee className={styles['bento-icon']} aria-hidden />
      </div>

      <div className={styles['support-note']}>
        <Coffee aria-hidden />
        <div className={styles['support-note-text']}>
          <strong>If Peptide saves you time</strong>
          <p>A small tip keeps development moving. Pick whichever's easiest.</p>
        </div>
      </div>

      <div className={styles['support-items']}>
        {hasVenmo && (
          <button type="button" className={styles['support-btn']} onClick={() => openExternal(venmoUrl(SUPPORT.venmo))}>
            <VenmoBadge />
            <div className={styles['support-details']}>
              <strong>Venmo</strong>
              <span>@{SUPPORT.venmo}</span>
            </div>
            <ExternalLink aria-hidden className={styles['support-btn-icon']} />
          </button>
        )}
        {hasCashapp && (
          <button type="button" className={styles['support-btn']} onClick={() => openExternal(cashappUrl(SUPPORT.cashapp))}>
            <CashAppBadge />
            <div className={styles['support-details']}>
              <strong>Cash App</strong>
              <span>${SUPPORT.cashapp}</span>
            </div>
            <ExternalLink aria-hidden className={styles['support-btn-icon']} />
          </button>
        )}
        {hasBase && (
          <button
            type="button"
            className={cx(styles['support-btn'], baseCopied ? styles['copied'] : undefined)}
            onClick={() => void copy('base', baseCopyValue)}
          >
            <BaseBadge />
            <div className={styles['support-details']}>
              <strong>Base</strong>
              <span>{baseLabel}</span>
            </div>
            {baseCopied ? (
              <Check aria-hidden className={styles['support-btn-icon']} />
            ) : (
              <Copy aria-hidden className={styles['support-btn-icon']} />
            )}
          </button>
        )}
      </div>
    </>
  );
}
