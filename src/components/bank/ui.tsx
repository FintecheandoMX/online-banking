import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { money, shortDate, type Transaction } from "../../lib/demo";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export function PageContainer({
  children,
  narrow = false,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className={`bank-page ${narrow ? "bank-page-narrow" : ""}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="bank-page-header">
      <div>
        <p className="bank-eyebrow">{eyebrow}</p>
        <h1 className="bank-title">{title}</h1>
        {description ? <p className="bank-subtitle">{description}</p> : null}
      </div>
      {aside ? <div className="bank-page-aside">{aside}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bank-card ${className}`}>
      {title || action ? (
        <div className="bank-card-head">
          {title ? <h2>{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon ?? <Search size={28} />}
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="bank-loading" role="status">
      <span className="loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <p>{label}</p>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

export function TransactionRows({
  transactions,
  hidden = false,
}: {
  transactions: Transaction[];
  hidden?: boolean;
}) {
  if (!transactions.length) return null;
  return (
    <ul className="transaction-list">
      {transactions.map((transaction) => (
        <li key={transaction.id}>
          <span
            className={`transaction-icon ${transaction.amount > 0 ? "incoming" : ""}`}
          >
            {transaction.amount > 0 ? (
              <ArrowDownLeft size={18} />
            ) : (
              <ArrowUpRight size={18} />
            )}
          </span>
          <span className="transaction-description">
            <strong>{transaction.description}</strong>
            <small>{transaction.detail}</small>
          </span>
          <time dateTime={transaction.date}>
            {shortDate(transaction.date)}
          </time>
          <strong
            className={`transaction-amount ${transaction.amount > 0 ? "positive" : ""}`}
          >
            {hidden
              ? "••••••"
              : `${transaction.amount > 0 ? "+" : "-"}${money(Math.abs(transaction.amount))}`}
          </strong>
        </li>
      ))}
    </ul>
  );
}
