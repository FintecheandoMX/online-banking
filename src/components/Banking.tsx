import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Download,
  Eye,
  EyeOff,
  FileClock,
  House,
  Info,
  Landmark,
  ListFilter,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Brand } from "./ui";
import { LocaleToggle, LocalizedTree, translate, useI18n } from "../i18n";
import SecurityPanel from "./bank/Security";
import {
  EmptyState,
  PageContainer,
  PageHeader,
  SectionCard,
  TransactionRows,
} from "./bank/ui";
import {
  exportTransactions,
  getAccounts,
  getTransactions,
  initialBeneficiaries,
  longDate,
  mapMifosTransactionToDisplay,
  money,
  shortDate,
  transferReceipt,
  validateTransferAmount,
  type Account,
  type BankView,
  type Beneficiary,
  type Segment,
  type Transaction,
  type Transfer,
} from "../lib/demo";
import {
  fetchSavingsAccountTransactions,
  type ClientInfo,
  type DisplayAccount,
} from "../lib/auth-api";

type TransferDraft = Omit<Transfer, "id" | "date" | "status">;

function TransactionList({
  transactions,
  hidden = false,
}: {
  transactions: Transaction[];
  hidden?: boolean;
}) {
  if (!transactions.length)
    return (
      <EmptyState
        title="No hay movimientos por aquí."
        description="Prueba otra búsqueda o realiza una transferencia de prueba."
      />
    );
  return <TransactionRows transactions={transactions} hidden={hidden} />;
}

function TransferPanel({
  accounts,
  beneficiaries,
  segment,
  onComplete,
  onActivity,
  onBeneficiaries,
  onApprovals,
}: {
  accounts: Account[];
  beneficiaries: Beneficiary[];
  segment: Segment;
  onComplete: (transfer: TransferDraft) => Transfer | null;
  onActivity: () => void;
  onBeneficiaries: () => void;
  onApprovals: () => void;
}) {
  const [step, setStep] = useState<"form" | "review" | "verify" | "success">(
    "form",
  );
  const [own, setOwn] = useState(false);
  const [from, setFrom] = useState(accounts[0].id);
  const [to, setTo] = useState(beneficiaries[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Transfer | null>(null);
  const source = accounts.find((account) => account.id === from)!;
  const destinationName = own
    ? accounts.find((account) => account.id === to)?.name
    : beneficiaries.find((beneficiary) => beneficiary.id === to)?.name;
  const cents = Math.round(Number(amount) * 100);

  function changeType(value: boolean) {
    setOwn(value);
    setTo(
      value
        ? accounts.find((account) => account.id !== from)!.id
        : (beneficiaries[0]?.id ?? ""),
    );
    setError("");
  }

  function review(event: FormEvent) {
    event.preventDefault();
    setError("");
    const validation = validateTransferAmount(amount, source.balance);
    if ("error" in validation) {
      setError(validation.error);
      return;
    }
    if (!destinationName || (own && from === to)) {
      setError("Selecciona una cuenta de destino diferente al origen.");
      return;
    }
    if (concept.trim().length < 2) {
      setError("Escribe un concepto de al menos 2 caracteres.");
      return;
    }
    setStep("review");
  }

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (otp !== "123456") {
      setError("El código no coincide. Para esta demo utiliza 123456.");
      return;
    }
    const transfer = onComplete({
      from,
      to,
      toName: destinationName!,
      amount: cents,
      concept: concept.trim(),
      own,
    });
    if (!transfer) {
      setError("El saldo disponible cambió. Regresa y verifica el importe.");
      return;
    }
    setResult(transfer);
    setStep("success");
    setError("");
  }

  if (step === "success" && result)
    return (
      <div className="transfer-success form-success" role="status">
        <span
          className={`success-symbol ${result.status === "pending" ? "pending-symbol" : ""}`}
        >
          {result.status === "pending" ? (
            <FileClock size={32} />
          ) : (
            <CheckCheck size={32} />
          )}
        </span>
        <p className="eyebrow">
          {result.status === "pending"
            ? "UN PASO MÁS, EN EQUIPO"
            : "ASÍ DE SIMPLE"}
        </p>
        <h2>
          {result.status === "pending"
            ? "Lista para una segunda firma."
            : "Transferencia simulada."}
        </h2>
        <p>
          {result.status === "pending"
            ? "El saldo no cambiará hasta que un segundo firmante apruebe esta operación de prueba."
            : "La operación se registró en tu cuenta de prueba. No se ha movido dinero real."}
        </p>
        <strong className="receipt-amount">
          {money(result.amount)} <small>MXN</small>
        </strong>
        <dl className="review-details">
          <div>
            <dt>Para</dt>
            <dd>{result.toName}</dd>
          </div>
          <div>
            <dt>Concepto</dt>
            <dd>{result.concept}</dd>
          </div>
          <div>
            <dt>Referencia demo</dt>
            <dd>{result.id}</dd>
          </div>
        </dl>
        <button
          className="button button-primary"
          onClick={result.status === "pending" ? onApprovals : onActivity}
        >
          {result.status === "pending"
            ? "Ver aprobaciones"
            : "Ver mis movimientos"}
          <ArrowRight size={17} />
        </button>
        <button
          className="button button-outline"
          onClick={() => transferReceipt(result)}
        >
          <Download size={16} />
          Descargar comprobante demo
        </button>
        <button
          className="subtle-link"
          onClick={() => {
            setStep("form");
            setAmount("");
            setConcept("");
            setOtp("");
            setResult(null);
          }}
        >
          Hacer otra transferencia
        </button>
      </div>
    );

  return (
    <div className="transfer-layout">
      <div className="transfer-form-area">
        <div
          className="step-indicator"
          aria-label="Progreso de la transferencia"
        >
          <span className="active" aria-current={step === "form" ? "step" : undefined}>
            1
          </span>
          <i aria-hidden="true" />
          <span
            className={step !== "form" ? "active" : ""}
            aria-current={step === "review" ? "step" : undefined}
          >
            2
          </span>
          <i aria-hidden="true" />
          <span
            className={step === "verify" ? "active" : ""}
            aria-current={step === "verify" ? "step" : undefined}
          >
            3
          </span>
        </div>
        <h2>
          {step === "form"
            ? "¿A dónde vamos hoy?"
            : step === "review"
              ? "Todo claro antes de continuar."
              : "Un último paso, por seguridad."}
        </h2>
        <p className="panel-description">
          {step === "form"
            ? "Elige el destino de tu transferencia de prueba."
            : step === "review"
              ? "Revisa los datos de tu operación simulada."
              : "Ingresa el código de demostración para confirmar."}
        </p>
        {step === "form" ? (
          <form onSubmit={review} className="form-stack">
            <div className="form-segment" role="group" aria-label="Tipo de transferencia">
              <button
                className={!own ? "selected" : ""}
                aria-pressed={!own}
                type="button"
                onClick={() => changeType(false)}
              >
                A un beneficiario
              </button>
              <button
                className={own ? "selected" : ""}
                aria-pressed={own}
                type="button"
                onClick={() => changeType(true)}
              >
                Entre mis cuentas
              </button>
            </div>
            <label>
              Cuenta de origen
              <select
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  if (own)
                    setTo(
                      accounts.find(
                        (account) => account.id !== event.target.value,
                      )!.id,
                    );
                }}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {money(account.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {own ? "Cuenta de destino" : "Beneficiario"}
              <select
                value={to}
                onChange={(event) => setTo(event.target.value)}
                required
              >
                <option value="" disabled>
                  Selecciona un destino
                </option>
                {own
                  ? accounts
                      .filter((account) => account.id !== from)
                      .map((account) => (
                        <option value={account.id} key={account.id}>
                          {account.name} · {account.number}
                        </option>
                      ))
                  : beneficiaries.map((beneficiary) => (
                      <option key={beneficiary.id} value={beneficiary.id}>
                        {beneficiary.name} · {beneficiary.account.slice(-4)}
                      </option>
                    ))}
              </select>
            </label>
            {!own && (
              <button
                className="subtle-link align-start"
                type="button"
                onClick={onBeneficiaries}
              >
                <Plus size={14} />
                Agregar un beneficiario
              </button>
            )}
            <label>
              Importe en MXN
              <div className="currency-input">
                <span aria-hidden="true">$</span>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={Math.min(50000, source.balance / 100)}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                />
                <span>MXN</span>
              </div>
            </label>
            <label>
              Concepto
              <input
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                required
                minLength={2}
                maxLength={40}
                placeholder="¿Para qué es esta transferencia?"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button button-primary" type="submit">
              Revisar transferencia
              <ArrowRight size={17} />
            </button>
            <p className="form-note">
              Límite de prueba: $50,000.00 MXN por operación.
            </p>
          </form>
        ) : (
          <>
            <dl className="review-details">
              <div>
                <dt>Desde</dt>
                <dd>{source.name}</dd>
              </div>
              <div>
                <dt>Para</dt>
                <dd>{destinationName}</dd>
              </div>
              <div>
                <dt>Importe</dt>
                <dd className="review-total">{money(cents)} MXN</dd>
              </div>
              <div>
                <dt>Concepto</dt>
                <dd>{concept.trim()}</dd>
              </div>
              <div>
                <dt>Comisión de prueba</dt>
                <dd>$0.00 MXN</dd>
              </div>
            </dl>
            {step === "review" ? (
              <div className="form-stack">
                <button
                  className="button button-primary"
                  onClick={() => {
                    setError("");
                    setStep("verify");
                  }}
                >
                  Continuar a verificación
                  <ShieldCheck size={17} />
                </button>
                <button
                  className="back-link centered"
                  onClick={() => setStep("form")}
                >
                  <ArrowLeft size={15} />
                  Editar datos
                </button>
              </div>
            ) : (
              <form onSubmit={confirm} className="form-stack">
                <label>
                  Código de verificación demo
                  <input
                    className="otp-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                  />
                </label>
                <p className="demo-code">
                  <Info size={15} />
                  Tu código de prueba es <strong>123456</strong>
                </p>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="button button-primary" type="submit">
                  {segment === "empresas"
                    ? "Enviar a segunda firma"
                    : "Confirmar transferencia demo"}
                  <Check size={17} />
                </button>
                <button
                  type="button"
                  className="back-link centered"
                  onClick={() => {
                    setStep("review");
                    setError("");
                  }}
                >
                  <ArrowLeft size={15} />
                  Volver al resumen
                </button>
              </form>
            )}
          </>
        )}
      </div>
      <aside className="transfer-aside" aria-label="Consejos de seguridad">
        <ShieldCheck size={30} />
        <h3>
          Tu tranquilidad
          <br />
          va primero.
        </h3>
        <p>
          Revisa siempre el destino y el importe antes de confirmar una
          operación.
        </p>
        {segment === "empresas" && (
          <div className="business-notice">
            <Users size={20} />
            <strong>Dos firmas. Más control.</strong>
            <p>
              Las transferencias empresariales requieren una segunda aprobación
              en esta demo.
            </p>
          </div>
        )}
        <span>
          <LockKeyhole size={13} />
          Entorno de demostración
        </span>
      </aside>
    </div>
  );
}

function BeneficiariesPanel({
  beneficiaries,
  onChange,
}: {
  beneficiaries: Beneficiary[];
  onChange: (beneficiaries: Beneficiary[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  function add(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Ingresa un nombre de al menos 2 caracteres.");
      return;
    }
    if (!/^\d{18}$/.test(account)) {
      setError("La cuenta de prueba debe tener exactamente 18 dígitos.");
      return;
    }
    if (beneficiaries.some((beneficiary) => beneficiary.account === account)) {
      setError("Esta cuenta ya está en tus beneficiarios.");
      return;
    }
    onChange([
      ...beneficiaries,
      { id: `beneficiary-${Date.now()}`, name: name.trim(), account },
    ]);
    setAdding(false);
    setName("");
    setAccount("");
    setError("");
    setNotice("Beneficiario de prueba agregado correctamente.");
  }
  return (
    <div className="beneficiaries-panel">
      <div className="panel-title-row">
        <p>Las personas que forman parte de tus planes.</p>
        <button
          className="button button-primary button-small"
          onClick={() => setAdding(!adding)}
          aria-expanded={adding}
        >
          {adding ? <X size={16} /> : <Plus size={16} />}
          {adding ? "Cancelar" : "Agregar beneficiario"}
        </button>
      </div>
      {adding && (
        <form onSubmit={add} className="form-stack beneficiary-form">
          <h3>Un nuevo destino.</h3>
          <label>
            Nombre del beneficiario de prueba
            <input
              required
              minLength={2}
              maxLength={50}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre y apellido ficticios"
              autoComplete="off"
            />
          </label>
          <label>
            Cuenta de prueba (18 dígitos)
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{18}"
              maxLength={18}
              value={account}
              onChange={(event) =>
                setAccount(event.target.value.replace(/\D/g, ""))
              }
              placeholder="000000000000000001"
              autoComplete="off"
            />
          </label>
          <p className="form-note">
            Usa únicamente datos ficticios. La cuenta no se verifica con ninguna
            institución.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button button-primary">
            Guardar beneficiario
            <Check size={16} />
          </button>
        </form>
      )}
      {notice && (
        <p className="inline-notice" role="status">
          <Check size={15} />
          {notice}
        </p>
      )}
      <ul className="beneficiary-list">
        {beneficiaries.map((beneficiary) => (
          <li key={beneficiary.id}>
            <span className="person-avatar" aria-hidden="true">
              {beneficiary.name
                .split(" ")
                .map((word) => word[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <strong>{beneficiary.name}</strong>
              <small>Cuenta demo · {beneficiary.account.slice(-4)}</small>
            </span>
            {deleting === beneficiary.id ? (
              <div className="delete-confirm">
                <span>¿Eliminar?</span>
                <button
                  className="subtle-link"
                  onClick={() => {
                    onChange(
                      beneficiaries.filter(
                        (item) => item.id !== beneficiary.id,
                      ),
                    );
                    setDeleting(null);
                    setNotice("Beneficiario eliminado de la demo.");
                  }}
                >
                  Sí
                </button>
                <button
                  className="subtle-link"
                  onClick={() => setDeleting(null)}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                className="icon-button"
                aria-label={`${translate("Eliminar a")} ${beneficiary.name}`}
                onClick={() => setDeleting(beneficiary.id)}
              >
                <Trash2 size={17} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!beneficiaries.length && (
        <EmptyState
          icon={<Users size={30} />}
          title="Tu lista comienza aquí."
          description="Agrega un beneficiario de prueba para simular una transferencia."
        />
      )}
    </div>
  );
}

// Helper to convert demo Account to DisplayAccount
function toDisplayAccount(acc: Account): DisplayAccount {
  return {
    id: acc.id,
    name: acc.name,
    number: acc.number,
    balance: acc.balance,
    type: "savings",
    status: "Active",
    currency: { 
      code: "MXN", 
      name: "Mexican Peso", 
      decimalPlaces: 2, 
      displaySymbol: "$", 
      nameCode: "currency.MXN", 
      displayLabel: "Mexican Peso ($)" 
    },
    rawAccount: {} as any,
  };
}

export default function DemoBank({
  segment,
  initialView,
  clientInfo,
  accounts: initialAccounts,
  authToken,
  onClose,
  onTimeout,
}: {
  segment: Segment;
  initialView: BankView;
  clientInfo?: ClientInfo;
  accounts?: DisplayAccount[];
  authToken?: string;
  onClose: () => void;
  onTimeout: () => void;
}) {
  const { locale } = useI18n();
  const [view, setView] = useState<BankView>(initialView);
  const [accounts, setAccounts] = useState<DisplayAccount[]>(() => {
    if (initialAccounts && initialAccounts.length > 0) {
      return initialAccounts;
    }
    return getAccounts(segment).map(toDisplayAccount);
  });
  const [transactions, setTransactions] = useState(() =>
    getTransactions(segment),
  );
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [beneficiaries, setBeneficiaries] =
    useState<Beneficiary[]>(initialBeneficiaries);
  const [approvals, setApprovals] = useState<Transfer[]>([]);
  const [hidden, setHidden] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalCode, setApprovalCode] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [notice, setNotice] = useState("");
  const [support, setSupport] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    document.body.classList.add("bank-shell-open");
    return () => document.body.classList.remove("bank-shell-open");
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onTimeoutRef.current(), 10 * 60 * 1000);
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, []);

  // Sync accounts state when initialAccounts prop changes (e.g., after API fetch)
  useEffect(() => {
    if (initialAccounts && initialAccounts.length > 0) {
      setAccounts(initialAccounts);
    }
  }, [initialAccounts]);

  // Fetch real transactions when a savings account is selected
  useEffect(() => {
    if (selectedAccount !== "all" && authToken && accounts) {
      const account = accounts.find((acc) => acc.id === selectedAccount);

      if (account && account.type === "savings" && "id" in account.rawAccount) {
        setIsLoadingTransactions(true);
        const savingsId = (account.rawAccount as any).id;

        fetchSavingsAccountTransactions(savingsId, authToken)
          .then((data) => {
            const mapped = data.transactions
              .filter((tx) => !tx.reversed)
              .map((tx) =>
                mapMifosTransactionToDisplay(
                  tx,
                  account.id,
                  account.currency.decimalPlaces
                )
              );
            setTransactions(mapped);
          })
          .catch((err) => {
            console.error("Error fetching transactions:", err);
            // Fallback to mock data filtered for this account type
            const mockTxs = getTransactions(segment).filter(
              (tx) => tx.accountId === "savings" || tx.accountId === "daily"
            );
            setTransactions(mockTxs.map((tx) => ({ ...tx, accountId: selectedAccount })));
          })
          .finally(() => {
            setIsLoadingTransactions(false);
          });
      } else {
        // For loan accounts or unauthenticated, fallback to mock
        const mockTxs = getTransactions(segment).filter(
          (tx) => tx.accountId === "savings" || tx.accountId === "daily"
        );
        setTransactions(mockTxs.map((tx) => ({ ...tx, accountId: selectedAccount })));
      }
    } else if (selectedAccount === "all") {
      setTransactions(getTransactions(segment));
    }
  }, [selectedAccount, authToken, accounts, segment]);

  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
    const pending = approvals.filter(
      (transfer) => transfer.status === "pending",
    ).length;
    const activity = useMemo(
      () =>
        transactions.filter((transaction) => {
          const matchesAccount =
            selectedAccount === "all" ||
            transaction.accountId === selectedAccount;
          const matchesType =
            filter === "all" ||
            (filter === "in" ? transaction.amount > 0 : transaction.amount < 0);
          const normalize = (value: string) =>
            value
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase();
          return (
            matchesAccount &&
            matchesType &&
            normalize(transaction.description + transaction.detail).includes(
              normalize(search),
            )
          );
        }),
      [transactions, selectedAccount, filter, search],
    );

    // Group accounts by type for overview display
      const savingsAccounts = accounts.filter((acc) => acc.type === "savings");
      const loanAccounts = accounts.filter((acc) => acc.type === "loan");

      function execute(transfer: Transfer): boolean {
    if (
      (accounts.find((account) => account.id === transfer.from)?.balance ?? 0) <
      transfer.amount
    )
      return false;
    setAccounts((current) =>
      current.map((account) => ({
        ...account,
        balance:
          account.balance -
          (account.id === transfer.from ? transfer.amount : 0) +
          (transfer.own && account.id === transfer.to ? transfer.amount : 0),
      })),
    );
    const debit: Transaction = {
      id: `${transfer.id}-out`,
      date: transfer.date,
      description: transfer.concept,
      detail: `Para ${transfer.toName}`,
      amount: -transfer.amount,
      accountId: transfer.from,
    };
    const newTransactions: Transaction[] = [debit];
    if (transfer.own)
      newTransactions.push({
        ...debit,
        id: `${transfer.id}-in`,
        detail: "Transferencia entre mis cuentas",
        amount: transfer.amount,
        accountId: transfer.to,
      });
    setTransactions((current) => [...newTransactions, ...current]);
    return true;
  }

  function completeTransfer(draft: TransferDraft): Transfer | null {
    const transfer: Transfer = {
      ...draft,
      id: `AVT-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toISOString(),
      status: segment === "empresas" ? "pending" : "approved",
    };
    if (segment === "empresas")
      setApprovals((current) => [transfer, ...current]);
    else if (!execute(transfer)) return null;
    return transfer;
  }

  function approve(event: FormEvent) {
    event.preventDefault();
    if (approvalCode !== "654321") {
      setApprovalError(
        "Para la segunda firma de prueba utiliza el código 654321.",
      );
      return;
    }
    const transfer = approvals.find(
      (item) => item.id === approvalId && item.status === "pending",
    );
    if (!transfer) return;
    if (!execute(transfer)) {
      setApprovalError(
        "El saldo ya no es suficiente para aprobar esta transferencia.",
      );
      return;
    }
    setApprovals((current) =>
      current.map((item) =>
        item.id === approvalId ? { ...item, status: "approved" } : item,
      ),
    );
    setApprovalId(null);
    setApprovalCode("");
    setApprovalError("");
    setNotice(
      "Segunda firma confirmada. Transferencia simulada correctamente.",
    );
  }

  const navigation = [
    { id: "overview" as const, label: "Mi resumen", icon: House },
    { id: "transfer" as const, label: "Transferir", icon: ArrowUpRight },
    { id: "activity" as const, label: "Movimientos", icon: ListFilter },
    { id: "beneficiaries" as const, label: "Beneficiarios", icon: Users },
    ...(segment === "empresas"
      ? [{ id: "approvals" as const, label: "Aprobaciones", icon: FileClock }]
      : []),
    { id: "security" as const, label: "Seguridad", icon: ShieldCheck },
  ];

  function navigate(next: BankView) {
    setView(next);
    setNotice("");
    setSupport(false);
    requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: 0 });
      document
        .getElementById("bank-page-title")
        ?.focus({ preventScroll: true });
    });
  }

  const userName = clientInfo?.displayName ?? (segment === "empresas" ? "Estudio Norte" : "Mariana López");
  const userFirstName = clientInfo?.firstname ?? (segment === "empresas" ? "Estudio Norte" : "Mariana");
  const userInitials = clientInfo
    ? `${clientInfo.firstname.charAt(0)}${clientInfo.lastname?.charAt(0) ?? ""}`.toUpperCase()
    : segment === "empresas"
    ? "EN"
    : "ML";
  const pageMeta: Record<BankView, { eyebrow: string; title: string }> = {
    overview: {
      eyebrow: "TU SIGUIENTE PASO COMIENZA AQUÍ",
      title: `Hola, ${userFirstName}.`,
    },
    transfer: { eyebrow: "TU DINERO, BAJO TU CONTROL", title: "Mueve tus planes." },
    activity: {
      eyebrow: "TU DINERO, BAJO TU CONTROL",
      title: "Cada paso, en detalle.",
    },
    beneficiaries: {
      eyebrow: "TU DINERO, BAJO TU CONTROL",
      title: "Tus personas de confianza.",
    },
    approvals: {
      eyebrow: "TU DINERO, BAJO TU CONTROL",
      title: "Avancemos en equipo.",
    },
    security: {
      eyebrow: "TU DINERO, BAJO TU CONTROL",
      title: "Tu seguridad, bajo control.",
    },
  };

  return (
    <LocalizedTree>
      <div className="bank-shell">
        <a href="#bank-content" className="skip-link">
          Saltar al contenido bancario
        </a>
        <aside className="bank-sidebar" aria-label="Banca demo">
          <Brand compact />
          <span className="bank-segment-label">
            BANCA {segment === "empresas" ? "EMPRESARIAL" : "PERSONAL"}
          </span>
          <nav aria-label="Navegación de banca demo">
            {navigation.map((item) => (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                aria-current={view === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.id === "approvals" && pending > 0 && (
                  <b className="count-badge">{pending}</b>
                )}
              </button>
            ))}
          </nav>
          <div className="bank-sidebar-bottom">
            <button
              className="bank-support"
              onClick={() => setSupport(!support)}
              aria-expanded={support}
            >
              <CircleHelp size={17} />
              Estamos de tu lado
            </button>
            <div className="bank-user">
              <span className="person-avatar" aria-hidden="true">
                {userInitials}
              </span>
              <span>
                <strong>{userName}</strong>
                <small>Perfil de demostración</small>
              </span>
              <button
                className="icon-button"
                aria-label="Cerrar sesión demo"
                title="Cerrar sesión demo"
                onClick={onClose}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>

        <div className="bank-shell-body">
          <header className="bank-topbar">
            <div className="bank-topbar-brand">
              <Brand compact />
            </div>
            <p className="bank-demo-pill">
              <i aria-hidden="true" />
              Experiencia de demostración
              <span>
                <LockKeyhole size={12} aria-hidden="true" />
                Sin dinero real
              </span>
            </p>
            <div className="bank-topbar-actions">
              <span className="bank-date">{longDate()}</span>
              <LocaleToggle compact />
              <button
                className="bank-topbar-help"
                onClick={() => setSupport(!support)}
                aria-expanded={support}
              >
                <CircleHelp size={16} />
                <span>Ayuda</span>
              </button>
              <button
                className="button button-outline button-small bank-exit"
                onClick={onClose}
              >
                <LogOut size={14} />
                Salir
              </button>
            </div>
          </header>

          <main
            className="bank-content"
            id="bank-content"
            ref={mainRef}
            tabIndex={-1}
            aria-labelledby="bank-page-title"
          >
            {support && (
              <div className="bank-support-panel" role="note">
                <CircleHelp size={20} />
                <div>
                  <strong>Una persona, cuando la necesitas.</strong>
                  <p>
                    Contacta a MIFOS al{" "}
                    <a href="tel:+524774614700">477 461 4700</a> o visita{" "}
                    <a
                      href="https://www.mifos.org/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      el sitio oficial
                    </a>
                    . No compartas contraseñas ni códigos.
                  </p>
                </div>
                <button
                  className="icon-button"
                  aria-label="Cerrar ayuda"
                  onClick={() => setSupport(false)}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <PageContainer>
              <span id="bank-page-title" tabIndex={-1} className="bank-title-anchor">
                <PageHeader
                  eyebrow={pageMeta[view].eyebrow}
                  title={pageMeta[view].title}
                />
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${view}-${locale}`}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {view === "overview" && (
                    <div className="overview-grid">
                      <SectionCard className="balance-hero">
                        <div className="total-balance">
                          <span>
                            Tu saldo total{" "}
                            <button
                              className="icon-button"
                              aria-label={
                                hidden ? "Mostrar saldos" : "Ocultar saldos"
                              }
                              onClick={() => setHidden(!hidden)}
                            >
                              {hidden ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </span>
                          <strong>
                            {hidden ? "••••••••" : money(total)}
                            <small>MXN</small>
                          </strong>
                          <p>Más claridad para lo que viene.</p>
                        </div>
                        
                        {/* Savings Accounts Group */}
                        {savingsAccounts.length > 0 && (
                          <div className="account-group">
                            <h3 className="account-group-title">
                              <Wallet size={16} />
                              Cuentas de Ahorro
                            </h3>
                            <div className="account-grid">
                              {savingsAccounts.map((account) => (
                                <button
                                  key={account.id}
                                  className={`account-choice ${selectedAccount === account.id ? "selected" : ""}`}
                                  aria-pressed={selectedAccount === account.id}
                                  onClick={() =>
                                    setSelectedAccount(
                                      selectedAccount === account.id ? "all" : account.id,
                                    )
                                  }
                                >
                                  <span className="account-choice-top">
                                    <span>
                                      <Landmark size={18} />
                                      {account.name}
                                    </span>
                                    <ChevronRight size={16} />
                                  </span>
                                  <strong>
                                    {hidden ? "••••••" : money(account.balance)}
                                  </strong>
                                  <small>
                                    Cuenta {account.status === "Active" ? "de prueba" : account.status} · {account.number}
                                  </small>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Loan Accounts Group */}
                        {loanAccounts.length > 0 && (
                          <div className="account-group">
                            <h3 className="account-group-title">
                              <Briefcase size={16} />
                              Créditos
                            </h3>
                            <div className="account-grid">
                              {loanAccounts.map((account) => (
                                <button
                                  key={account.id}
                                  className={`account-choice ${selectedAccount === account.id ? "selected" : ""}`}
                                  aria-pressed={selectedAccount === account.id}
                                  onClick={() =>
                                    setSelectedAccount(
                                      selectedAccount === account.id ? "all" : account.id,
                                    )
                                  }
                                >
                                  <span className="account-choice-top">
                                    <span>
                                      <Briefcase size={18} />
                                      {account.name}
                                    </span>
                                    <ChevronRight size={16} />
                                  </span>
                                  <strong className="loan-balance">
                                    {hidden ? "••••••" : money(account.balance)}
                                  </strong>
                                  <small>
                                    Saldo pendiente · {account.number}
                                  </small>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bank-quick-actions">
                          <button
                            className="button button-primary"
                            onClick={() => navigate("transfer")}
                          >
                            <Send size={16} />
                            Hacer una transferencia
                          </button>
                          <button
                            className="button button-outline"
                            onClick={() => navigate("activity")}
                          >
                            Ver movimientos
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </SectionCard>
                      <SectionCard
                        title="Lo más reciente"
                        action={
                          <button
                            className="subtle-link"
                            onClick={() => navigate("activity")}
                          >
                            Ver todos
                            <ArrowRight size={14} />
                          </button>
                        }
                        className="recent-card"
                      >
                        <TransactionList
                          transactions={transactions
                            .filter(
                              (transaction) =>
                                selectedAccount === "all" ||
                                transaction.accountId === selectedAccount,
                            )
                            .slice(0, 4)}
                          hidden={hidden}
                        />
                      </SectionCard>
                    </div>
                  )}
                  {view === "transfer" && (
                    <SectionCard className="transfer-card">
                      <TransferPanel
                        accounts={accounts}
                        beneficiaries={beneficiaries}
                        segment={segment}
                        onComplete={completeTransfer}
                        onActivity={() => {
                          setSelectedAccount("all");
                          setFilter("all");
                          setSearch("");
                          navigate("activity");
                        }}
                        onBeneficiaries={() => navigate("beneficiaries")}
                        onApprovals={() => navigate("approvals")}
                      />
                    </SectionCard>
                  )}
                  {view === "activity" && (
                    <SectionCard className="activity-card">
                      {isLoadingTransactions ? (
                        <div className="flex items-center justify-center p-8 text-text-secondary">
                          <LoaderCircle className="spin mr-2" size={20} />
                          Cargando movimientos...
                        </div>
                      ) : (
                        <>
                          <div className="activity-toolbar">
                            <label className="search-input">
                              <Search size={17} />
                              <span className="sr-only">Buscar movimientos</span>
                              <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar un movimiento"
                              />
                            </label>
                            <label className="sr-only" htmlFor="activity-filter">
                              Tipo de movimiento
                            </label>
                            <select
                              id="activity-filter"
                              value={filter}
                              onChange={(event) => setFilter(event.target.value)}
                            >
                              <option value="all">Todos los movimientos</option>
                              <option value="in">Ingresos</option>
                              <option value="out">Egresos</option>
                            </select>
                            <button
                              className="button button-outline button-small"
                              onClick={() => exportTransactions(activity)}
                              disabled={!activity.length}
                            >
                              <Download size={15} />
                              CSV
                            </button>
                          </div>
                          <div
                            className="account-filter"
                            role="group"
                            aria-label="Filtrar por cuenta"
                          >
                            <button
                              className={selectedAccount === "all" ? "active" : ""}
                              aria-pressed={selectedAccount === "all"}
                              onClick={() => setSelectedAccount("all")}
                            >
                              Todas las cuentas
                            </button>
                            {accounts.map((account) => (
                              <button
                                key={account.id}
                                className={
                                  selectedAccount === account.id ? "active" : ""
                                }
                                aria-pressed={selectedAccount === account.id}
                                onClick={() => setSelectedAccount(account.id)}
                              >
                                {account.name}
                              </button>
                            ))}
                          </div>
                          <p className="results-count" role="status">
                            {activity.length}{" "}
                            {translate(
                              activity.length === 1
                                ? "movimiento de demostración"
                                : "movimientos de demostración",
                              locale,
                            )}
                          </p>
                          <TransactionList transactions={activity} />
                        </>
                      )}
                    </SectionCard>
                  )}
                  {view === "beneficiaries" && (
                    <SectionCard className="beneficiaries-card">
                      <BeneficiariesPanel
                        beneficiaries={beneficiaries}
                        onChange={setBeneficiaries}
                      />
                    </SectionCard>
                  )}
                  {view === "approvals" && (
                    <div className="approvals-panel">
                      <div className="demo-notice">
                        <Building2 size={20} />
                        <span>
                          Dos firmas, un mismo objetivo. Aquí puedes simular la
                          aprobación de un segundo firmante. Código de prueba:{" "}
                          <strong>654321</strong>.
                        </span>
                      </div>
                      {notice && (
                        <p className="inline-notice" role="status">
                          <Check size={16} />
                          {notice}
                        </p>
                      )}
                      {!approvals.length ? (
                        <EmptyState
                          icon={<CheckCheck size={32} />}
                          title="Todo está al día."
                          description="Las nuevas transferencias empresariales aparecerán aquí para su segunda firma."
                          action={
                            <button
                              className="button button-primary"
                              onClick={() => navigate("transfer")}
                            >
                              Crear transferencia
                              <ArrowRight size={16} />
                            </button>
                          }
                        />
                      ) : (
                        <ul className="approval-list">
                          {approvals.map((transfer) => (
                            <li key={transfer.id}>
                              <div className="approval-summary">
                                <span className="transaction-icon">
                                  <FileClock size={19} />
                                </span>
                                <div>
                                  <strong>{transfer.toName}</strong>
                                  <small>
                                    {transfer.concept} ·{" "}
                                    {shortDate(transfer.date)}
                                  </small>
                                </div>
                                <strong>{money(transfer.amount)}</strong>
                                <span
                                  className={`approval-status ${transfer.status}`}
                                >
                                  {transfer.status === "pending"
                                    ? "Por aprobar"
                                    : transfer.status === "approved"
                                      ? "Aprobada"
                                      : "Rechazada"}
                                </span>
                              </div>
                              {transfer.status === "pending" &&
                                (approvalId === transfer.id ? (
                                  <form
                                    className="approval-form form-stack"
                                    onSubmit={approve}
                                  >
                                    <label>
                                      Código de segunda firma demo
                                      <input
                                        value={approvalCode}
                                        onChange={(event) =>
                                          setApprovalCode(
                                            event.target.value.replace(
                                              /\D/g,
                                              "",
                                            ),
                                          )
                                        }
                                        inputMode="numeric"
                                        pattern="[0-9]{6}"
                                        maxLength={6}
                                        placeholder="654321"
                                        required
                                      />
                                    </label>
                                    {approvalError && (
                                      <p role="alert" className="form-error">
                                        {approvalError}
                                      </p>
                                    )}
                                    <div className="approval-actions">
                                      <button
                                        className="button button-primary button-small"
                                        type="submit"
                                      >
                                        Confirmar segunda firma
                                        <Check size={16} />
                                      </button>
                                      <button
                                        className="subtle-link"
                                        type="button"
                                        onClick={() => {
                                          setApprovalId(null);
                                          setApprovalCode("");
                                          setApprovalError("");
                                        }}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="approval-actions">
                                    <button
                                      className="button button-primary button-small"
                                      onClick={() => {
                                        setApprovalId(transfer.id);
                                        setApprovalCode("");
                                        setApprovalError("");
                                      }}
                                    >
                                      Simular segunda firma
                                      <ShieldCheck size={15} />
                                    </button>
                                    <button
                                      className="subtle-link"
                                      onClick={() => {
                                        setApprovals((current) =>
                                          current.map((item) =>
                                            item.id === transfer.id
                                              ? { ...item, status: "rejected" }
                                              : item,
                                          ),
                                        );
                                        setNotice(
                                          "Operación rechazada. Tu saldo no se modificó.",
                                        );
                                      }}
                                    >
                                      Rechazar
                                    </button>
                                  </div>
                                ))}
                              {transfer.status === "approved" && (
                                <button
                                  className="subtle-link receipt-link"
                                  onClick={() => transferReceipt(transfer)}
                                >
                                  <Download size={14} />
                                  Comprobante demo
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {view === "security" && <SecurityPanel />}
                </motion.div>
              </AnimatePresence>
              <p className="bank-disclaimer">
                <Info size={13} />
                Todos los datos son ficticios. La sesión se cierra tras 10
                minutos de inactividad.
              </p>
            </PageContainer>
          </main>
        </div>

        <nav className="bank-bottomnav" aria-label="Navegación de banca demo">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.id === "approvals" && pending > 0 && (
                <b className="count-badge">{pending}</b>
              )}
            </button>
          ))}
        </nav>
      </div>
    </LocalizedTree>
  );
}
