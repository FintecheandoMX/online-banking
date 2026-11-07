import { useState, type FormEvent } from "react";
import {
  Check,
  Copy,
  KeyRound,
  ListChecks,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { LocalizedTree } from "../../i18n";
import { EmptyState, SectionCard } from "./ui";

type SecurityTab = "password" | "authenticator" | "activity" | "contacts";

const tabs: { id: SecurityTab; label: string; icon: typeof KeyRound }[] = [
  { id: "password", label: "Contraseña", icon: KeyRound },
  { id: "authenticator", label: "Verificación", icon: Smartphone },
  { id: "activity", label: "Actividad", icon: ListChecks },
  { id: "contacts", label: "Contactos", icon: Users },
];

const demoActivity = [
  {
    id: "a1",
    title: "Inicio de sesión demo",
    detail: "Navegador actual · Sesión local",
    date: "Hoy",
  },
  {
    id: "a2",
    title: "Transferencia simulada",
    detail: "Operación de prueba · Sin movimiento real",
    date: "Ayer",
  },
  {
    id: "a3",
    title: "Beneficiario de prueba agregado",
    detail: "Lista local de demostración",
    date: "Esta semana",
  },
];

export default function SecurityPanel() {
  const [tab, setTab] = useState<SecurityTab>("password");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authError, setAuthError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [contacts, setContacts] = useState([
    { id: "c1", name: "Sofía Martínez", detail: "Contacto demo · Notificaciones" },
  ]);
  const [contactName, setContactName] = useState("");
  const [contactNotice, setContactNotice] = useState("");

  function changePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");
    if (current !== "Mifos#26") {
      setPasswordError(
        "La contraseña actual de prueba no coincide. Usa Mifos#26.",
      );
      return;
    }
    if (next.length < 8) {
      setPasswordError("La nueva contraseña demo debe tener 8 caracteres o más.");
      return;
    }
    if (next !== confirm) {
      setPasswordError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    setPasswordNotice(
      "Contraseña de prueba actualizada solo para esta sesión demo.",
    );
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  function enableAuthenticator(event: FormEvent) {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");
    if (authCode !== "123456") {
      setAuthError("El código demo no coincide. Usa 123456 para simular.");
      return;
    }
    setAuthEnabled(true);
    setAuthNotice("Verificación demo activada en este dispositivo de prueba.");
    setAuthCode("");
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText("DEMO-MIFOS-123456");
      setCopyNotice("Clave demo copiada.");
    } catch {
      setCopyNotice("Copia manualmente: DEMO-MIFOS-123456.");
    }
  }

  function addContact(event: FormEvent) {
    event.preventDefault();
    if (contactName.trim().length < 2) {
      setContactNotice("Escribe un nombre de al menos 2 caracteres.");
      return;
    }
    setContacts((currentList) => [
      ...currentList,
      {
        id: `contact-${Date.now()}`,
        name: contactName.trim(),
        detail: "Contacto demo · Solo esta sesión",
      },
    ]);
    setContactName("");
    setContactNotice("Contacto demo agregado a la lista local.");
  }

  return (
    <LocalizedTree>
      <div className="security-panel">
        <div
          className="security-tabs"
          role="tablist"
          aria-label="Configuración de seguridad demo"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>

        {tab === "password" && (
          <SectionCard title="Cambiar contraseña demo">
            <p className="panel-description">
              Práctica el flujo sin exponer credenciales reales. Nada sale de
              este navegador.
            </p>
            <form className="form-stack security-form" onSubmit={changePassword}>
              <label>
                Contraseña actual de prueba
                <input
                  type="password"
                  autoComplete="off"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  placeholder="Mifos#26"
                  required
                />
              </label>
              <label>
                Nueva contraseña demo
                <input
                  type="password"
                  autoComplete="off"
                  value={next}
                  onChange={(event) => setNext(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
              </label>
              <label>
                Confirmar nueva contraseña
                <input
                  type="password"
                  autoComplete="off"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Repite la contraseña"
                  required
                />
              </label>
              {passwordError && (
                <p className="form-error" role="alert">
                  {passwordError}
                </p>
              )}
              {passwordNotice && (
                <p className="inline-notice" role="status">
                  <Check size={15} />
                  {passwordNotice}
                </p>
              )}
              <button className="button button-primary" type="submit">
                Actualizar contraseña demo
                <ShieldCheck size={16} />
              </button>
            </form>
          </SectionCard>
        )}

        {tab === "authenticator" && (
          <SectionCard title="Verificación en dos pasos demo">
            <p className="panel-description">
              Simula una app de verificación. El código de prueba siempre es
              123456.
            </p>
            <div className="auth-secret">
              <div>
                <strong>Clave demo</strong>
                <code>DEMO-MIFOS-123456</code>
              </div>
              <button
                className="button button-outline button-small"
                type="button"
                onClick={copySecret}
              >
                <Copy size={14} />
                Copiar
              </button>
            </div>
            {copyNotice && (
              <p className="form-note" role="status">
                {copyNotice}
              </p>
            )}
            {authEnabled ? (
              <p className="inline-notice" role="status">
                <Check size={15} />
                {authNotice || "Verificación demo activa en esta sesión."}
              </p>
            ) : (
              <form
                className="form-stack security-form"
                onSubmit={enableAuthenticator}
              >
                <label>
                  Código de 6 dígitos
                  <input
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={authCode}
                    onChange={(event) =>
                      setAuthCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="123456"
                    required
                  />
                </label>
                {authError && (
                  <p className="form-error" role="alert">
                    {authError}
                  </p>
                )}
                <button className="button button-primary" type="submit">
                  Activar verificación demo
                  <Check size={16} />
                </button>
              </form>
            )}
          </SectionCard>
        )}

        {tab === "activity" && (
          <SectionCard title="Actividad reciente demo">
            <p className="panel-description">
              Registro ilustrativo de esta sesión local. No proviene de ningún
              servidor bancario.
            </p>
            <ul className="security-activity">
              {demoActivity.map((item) => (
                <li key={item.id}>
                  <span className="transaction-icon">
                    <ShieldCheck size={16} />
                  </span>
                  <span className="transaction-description">
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <span className="activity-date">{item.date}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {tab === "contacts" && (
          <SectionCard title="Contactos de confianza demo">
            <p className="panel-description">
              Lista local para avisos de prueba. No envía notificaciones reales.
            </p>
            {contacts.length ? (
              <ul className="beneficiary-list security-contacts">
                {contacts.map((contact) => (
                  <li key={contact.id}>
                    <span className="person-avatar">
                      {contact.name
                        .split(" ")
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span>
                      <strong>{contact.name}</strong>
                      <small>{contact.detail}</small>
                    </span>
                    <button
                      className="subtle-link"
                      type="button"
                      onClick={() =>
                        setContacts((currentList) =>
                          currentList.filter((item) => item.id !== contact.id),
                        )
                      }
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Sin contactos de prueba."
                description="Agrega un contacto demo para organizar tus avisos de prueba."
              />
            )}
            <form className="contact-form" onSubmit={addContact}>
              <label>
                <span className="sr-only">Nombre del contacto demo</span>
                <input
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Nombre del contacto demo"
                  maxLength={60}
                  autoComplete="off"
                />
              </label>
              <button className="button button-primary" type="submit">
                Agregar
              </button>
            </form>
            {contactNotice && (
              <p className="inline-notice" role="status">
                <Check size={15} />
                {contactNotice}
              </p>
            )}
          </SectionCard>
        )}
      </div>
    </LocalizedTree>
  );
}
