import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Datenschutz: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <h1 className="text-3xl font-bold text-white mb-8">
          Datenschutzerkl&auml;rung
        </h1>

        {/* 1. Verantwortlicher */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            1. Verantwortlicher
          </h2>
          <div className="text-dark-300 space-y-2">
            <p>
              Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO)
              und anderer nationaler Datenschutzgesetze sowie sonstiger
              datenschutzrechtlicher Bestimmungen ist:
            </p>
            <div className="mt-3">
              <p>Martin Pfeffer</p>
              <p>celox.io (Einzelunternehmen)</p>
              <p>
                E-Mail:{' '}
                <a
                  href="mailto:martin.pfeffer@celox.io"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  martin.pfeffer@celox.io
                </a>
              </p>
              <p>
                Website:{' '}
                <a
                  href="https://stateofthedart.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  https://stateofthedart.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* 2. Uebersicht der Verarbeitungen */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            2. &Uuml;bersicht der Verarbeitungen
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Die nachfolgende &Uuml;bersicht fasst die Arten der verarbeiteten
              Daten und die Zwecke ihrer Verarbeitung zusammen und verweist auf
              die betroffenen Personen.
            </p>
            <h3 className="text-lg font-medium text-white mt-4 mb-2">
              Arten der verarbeiteten Daten
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Bestandsdaten (Name, E-Mail-Adresse)</li>
              <li>Nutzungsdaten (Spielstatistiken, Spielverlauf, Trainingsdaten)</li>
              <li>Authentifizierungsdaten (Passwort-Hash, OAuth-Token)</li>
              <li>Zahlungsdaten (werden ausschlie&szlig;lich bei Stripe verarbeitet)</li>
              <li>Meta-/Kommunikationsdaten (IP-Adresse, Browser-Informationen)</li>
            </ul>
            <h3 className="text-lg font-medium text-white mt-4 mb-2">
              Kategorien betroffener Personen
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Nutzer der Webanwendung &bdquo;State of the Dart&ldquo;</li>
            </ul>
            <h3 className="text-lg font-medium text-white mt-4 mb-2">
              Zwecke der Verarbeitung
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Bereitstellung der Dart-Scoring-Anwendung und ihrer Funktionen</li>
              <li>Nutzerauthentifizierung und Kontoverwaltung</li>
              <li>Speicherung und Anzeige von Spielstatistiken</li>
              <li>Abwicklung von Zahlungen (via Stripe)</li>
              <li>Sicherheit und Missbrauchspr&auml;vention</li>
            </ul>
          </div>
        </div>

        {/* 3. Rechtsgrundlagen */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            3. Rechtsgrundlagen der Verarbeitung
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Im Folgenden erhalten Sie eine &Uuml;bersicht der Rechtsgrundlagen
              der DSGVO, auf deren Basis wir personenbezogene Daten verarbeiten:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong className="text-white">
                  Vertragserf&uuml;llung (Art. 6 Abs. 1 lit. b DSGVO):
                </strong>{' '}
                Die Verarbeitung ist f&uuml;r die Erf&uuml;llung eines Vertrags
                oder vorvertraglicher Ma&szlig;nahmen erforderlich. Dies umfasst
                die Registrierung, Kontoverwaltung und Bereitstellung der
                Anwendungsfunktionen.
              </li>
              <li>
                <strong className="text-white">
                  Berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO):
                </strong>{' '}
                Die Verarbeitung dient unseren berechtigten Interessen, z.B. zur
                Gew&auml;hrleistung der Sicherheit und des Betriebs der
                Anwendung, sowie zur Verbesserung unseres Dienstes.
              </li>
              <li>
                <strong className="text-white">
                  Gesetzliche Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO):
                </strong>{' '}
                Soweit wir gesetzlichen Aufbewahrungspflichten unterliegen
                (insbesondere steuerrechtliche Pflichten bei Zahlungsvorg&auml;ngen).
              </li>
            </ul>
          </div>
        </div>

        {/* 4. Registrierung und Authentifizierung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            4. Registrierung und Authentifizierung
          </h2>
          <div className="text-dark-300 space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                4.1 E-Mail-Registrierung
              </h3>
              <p>
                Bei der Registrierung &uuml;ber E-Mail erheben wir folgende
                Daten:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                <li>Name</li>
                <li>E-Mail-Adresse</li>
                <li>Passwort (wird als kryptografischer Hash gespeichert; das Klartext-Passwort wird nicht gespeichert)</li>
              </ul>
              <p className="mt-2">
                Die E-Mail-Adresse wird zur Verifizierung Ihres Kontos, zur
                Passwort-Wiederherstellung und zur Kommunikation bez&uuml;glich
                Ihres Kontos verwendet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
                DSGVO (Vertragserf&uuml;llung).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                4.2 Google OAuth
              </h3>
              <p>
                Alternativ k&ouml;nnen Sie sich &uuml;ber Google OAuth
                anmelden. Dabei erhalten wir von Google folgende Daten:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                <li>Google-Benutzer-ID</li>
                <li>Name (Anzeigename)</li>
                <li>E-Mail-Adresse</li>
                <li>Profilbild-URL</li>
              </ul>
              <p className="mt-2">
                Die Anmeldung &uuml;ber Google erfolgt auf freiwilliger Basis. Wir
                erhalten keinen Zugriff auf Ihr Google-Passwort. Weitere
                Informationen zur Datenverarbeitung durch Google finden Sie in der{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Datenschutzerkl&auml;rung von Google
                </a>
                . Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
                (Vertragserf&uuml;llung).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                4.3 JSON Web Tokens (JWT)
              </h3>
              <p>
                Nach erfolgreicher Anmeldung wird ein JSON Web Token (JWT) im
                localStorage Ihres Browsers gespeichert. Dieses Token dient der
                Authentifizierung bei nachfolgenden Anfragen an unseren Server.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                <li>
                  Wir verwenden <strong className="text-white">keine Cookies</strong> f&uuml;r Tracking oder Authentifizierung.
                </li>
                <li>
                  Das JWT wird ausschlie&szlig;lich im localStorage Ihres Browsers
                  gespeichert und bei Abmeldung gel&ouml;scht.
                </li>
                <li>
                  Das Token enth&auml;lt Ihre Benutzer-ID und hat eine begrenzte
                  G&uuml;ltigkeitsdauer.
                </li>
              </ul>
              <p className="mt-2">
                Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
                (Vertragserf&uuml;llung) sowie Art. 6 Abs. 1 lit. f DSGVO
                (berechtigtes Interesse an der sicheren Authentifizierung).
              </p>
            </div>
          </div>
        </div>

        {/* 5. Datenverarbeitung in der Anwendung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            5. Datenverarbeitung in der Anwendung
          </h2>
          <div className="text-dark-300 space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                5.1 Spielstatistiken und Nutzungsdaten
              </h3>
              <p>
                Im Rahmen der Nutzung der Anwendung werden folgende Daten
                verarbeitet und gespeichert:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                <li>Spielernamen und Spielerprofile</li>
                <li>Spielverl&auml;ufe (Matches), inkl. Wurfdaten und Ergebnisse</li>
                <li>Trainings-Sitzungen und -Ergebnisse</li>
                <li>Achievements (freigeschaltete Erfolge)</li>
                <li>Spieler-Heatmaps (Wurfverteilungen)</li>
                <li>App-Einstellungen (Theme, Sprache, Audio-Pr&auml;ferenzen)</li>
              </ul>
              <p className="mt-2">
                Diese Daten werden ausschlie&szlig;lich zur Bereitstellung der
                Anwendungsfunktionen verarbeitet. Rechtsgrundlage ist Art. 6 Abs.
                1 lit. b DSGVO (Vertragserf&uuml;llung).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                5.2 Datenspeicherung
              </h3>
              <p>
                Alle Nutzerdaten werden in einer SQLite-Datenbank auf unserem
                Virtual Private Server (VPS) in einem Rechenzentrum gespeichert.
                Der Server befindet sich unter der Adresse{' '}
                <span className="text-white">api.stateofthedart.com</span>.
              </p>
              <p className="mt-2">
                Die Kommunikation zwischen Ihrem Browser und unserem Server
                erfolgt ausschlie&szlig;lich &uuml;ber verschl&uuml;sselte
                HTTPS-Verbindungen (TLS/SSL).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                5.3 Multi-Tenant-System
              </h3>
              <p>
                Die Anwendung verwendet ein Multi-Tenant-System (Profile). Ihre
                Daten sind logisch von den Daten anderer Nutzer getrennt. Jeder
                Nutzer kann nur auf seine eigenen Profile und die darin enthaltenen
                Daten zugreifen.
              </p>
            </div>
          </div>
        </div>

        {/* 6. Zahlungsabwicklung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            6. Zahlungsabwicklung &uuml;ber Stripe
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              F&uuml;r die Abwicklung von Zahlungen nutzen wir den
              Zahlungsdienstleister <strong className="text-white">Stripe, Inc.</strong>{' '}
              (510 Townsend Street, San Francisco, CA 94103, USA).
            </p>
            <p>
              Bei einem Zahlungsvorgang werden Ihre Zahlungsdaten
              (Kreditkartendaten, Bankdaten o.&auml;.)
              <strong className="text-white"> direkt von Stripe</strong> verarbeitet.
              Wir speichern keine vollst&auml;ndigen Zahlungsdaten auf unseren
              Servern. Wir erhalten von Stripe lediglich eine Best&auml;tigung
              &uuml;ber den Zahlungsstatus sowie eine Referenz-ID.
            </p>
            <p>
              Stripe ist als Zahlungsdienstleister nach dem Payment Card Industry
              Data Security Standard (PCI DSS) zertifiziert. Stripe verarbeitet
              Daten auch in den USA. Es gelten die{' '}
              <a
                href="https://stripe.com/de/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 transition-colors"
              >
                Datenschutzbestimmungen von Stripe
              </a>
              .
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserf&uuml;llung).
            </p>
          </div>
        </div>

        {/* 7. Progressive Web App */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            7. Progressive Web App (PWA) und Service Worker
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              &bdquo;State of the Dart&ldquo; ist eine Progressive Web App (PWA). Bei der
              Installation oder Nutzung der Anwendung kann ein Service Worker in
              Ihrem Browser aktiviert werden, der folgende Funktionen
              erm&ouml;glicht:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong className="text-white">Offline-Caching:</strong>{' '}
                Anwendungsdateien, Audiodateien und Schriftarten werden lokal im
                Browser-Cache zwischengespeichert, um die Anwendung auch ohne
                Internetverbindung nutzbar zu machen.
              </li>
              <li>
                <strong className="text-white">localStorage-Cache:</strong>{' '}
                Spielstände und Einstellungen werden zus&auml;tzlich im
                localStorage Ihres Browsers zwischengespeichert, um schnellere
                Ladezeiten und Offline-Unterst&uuml;tzung zu gew&auml;hrleisten.
              </li>
            </ul>
            <p>
              Diese lokalen Daten verbleiben ausschlie&szlig;lich auf Ihrem
              Ger&auml;t und werden nicht an Dritte &uuml;bermittelt. Sie
              k&ouml;nnen den Service Worker und den lokalen Cache jederzeit
              &uuml;ber die Browser-Einstellungen l&ouml;schen.
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserf&uuml;llung) und Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse an einer performanten Anwendung).
            </p>
          </div>
        </div>

        {/* 8. Server-Logging */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            8. Server-Logging
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Bei jedem Zugriff auf unseren Server werden automatisch folgende
              Daten in Server-Logdateien gespeichert:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>IP-Adresse des zugreifenden Ger&auml;ts</li>
              <li>Datum und Uhrzeit des Zugriffs</li>
              <li>Angeforderte URL bzw. API-Endpunkt</li>
              <li>HTTP-Statuscode</li>
              <li>&Uuml;bertragene Datenmenge</li>
              <li>Browser und Betriebssystem (User-Agent)</li>
            </ul>
            <p>
              Diese Daten werden zur Sicherstellung eines st&ouml;rungsfreien
              Betriebs, zur Erkennung und Abwehr von Angriffen sowie zur
              Fehleranalyse erhoben. Die Logdateien werden regelm&auml;&szlig;ig
              gel&ouml;scht.
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
              Interesse an der Sicherheit und Stabilit&auml;t des Systems).
            </p>
          </div>
        </div>

        {/* 9. Keine Tracking- oder Analysetools */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            9. Keine Tracking- oder Analysetools
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Wir setzen <strong className="text-white">keine</strong> Tracking-
              oder Analysewerkzeuge ein. Insbesondere verwenden wir:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Kein Google Analytics</li>
              <li>Keine Tracking-Pixel oder Web-Beacons</li>
              <li>Keine Cookies zu Tracking-Zwecken</li>
              <li>Keine Social-Media-Plugins mit Tracking-Funktion</li>
              <li>Keine Werbenetzwerke</li>
            </ul>
            <p>
              Ein Cookie-Banner ist daher nicht erforderlich, da wir keine Cookies
              setzen, die einer Einwilligung bed&uuml;rfen.
            </p>
          </div>
        </div>

        {/* 10. SSL-/TLS-Verschluesselung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            10. SSL-/TLS-Verschl&uuml;sselung
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Diese Anwendung nutzt aus Sicherheitsgr&uuml;nden und zum Schutz
              der &Uuml;bertragung vertraulicher Inhalte eine
              SSL-/TLS-Verschl&uuml;sselung. Eine verschl&uuml;sselte Verbindung
              erkennen Sie daran, dass die Adresszeile des Browsers von
              &bdquo;http://&ldquo; auf &bdquo;https://&ldquo; wechselt und an dem
              Schloss-Symbol in Ihrer Browserzeile.
            </p>
            <p>
              Wenn die SSL-/TLS-Verschl&uuml;sselung aktiviert ist, k&ouml;nnen
              die Daten, die Sie an uns &uuml;bermitteln, nicht von Dritten
              mitgelesen werden.
            </p>
          </div>
        </div>

        {/* 11. Rechte der betroffenen Person */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            11. Ihre Rechte als betroffene Person
          </h2>
          <div className="text-dark-300 space-y-4">
            <p>
              Ihnen stehen als betroffene Person folgende Rechte nach der DSGVO
              zu:
            </p>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                11.1 Auskunftsrecht (Art. 15 DSGVO)
              </h3>
              <p>
                Sie haben das Recht, eine Best&auml;tigung dar&uuml;ber zu
                verlangen, ob personenbezogene Daten verarbeitet werden. Ist dies
                der Fall, haben Sie Anspruch auf Auskunft &uuml;ber diese Daten
                sowie auf weitere Informationen gem&auml;&szlig; Art. 15 DSGVO.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                11.2 Recht auf Berichtigung (Art. 16 DSGVO)
              </h3>
              <p>
                Sie haben das Recht, unverz&uuml;glich die Berichtigung
                unrichtiger personenbezogener Daten zu verlangen. Unter
                Ber&uuml;cksichtigung der Zwecke der Verarbeitung haben Sie das
                Recht, die Vervollst&auml;ndigung unvollst&auml;ndiger Daten zu
                verlangen.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                11.3 Recht auf L&ouml;schung (Art. 17 DSGVO)
              </h3>
              <p>
                Sie haben das Recht, die L&ouml;schung Ihrer personenbezogenen
                Daten zu verlangen, sofern die gesetzlichen Voraussetzungen
                vorliegen. Sie k&ouml;nnen Ihr Konto und alle zugehörigen
                Daten jederzeit &uuml;ber die Kontoeinstellungen in der
                Anwendung l&ouml;schen oder uns per E-Mail kontaktieren.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                11.4 Recht auf Einschr&auml;nkung der Verarbeitung (Art. 18
                DSGVO)
              </h3>
              <p>
                Sie haben das Recht, die Einschr&auml;nkung der Verarbeitung
                Ihrer personenbezogenen Daten zu verlangen, sofern die
                gesetzlichen Voraussetzungen vorliegen.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                11.5 Recht auf Daten&uuml;bertragbarkeit (Art. 20 DSGVO)
              </h3>
              <p>
                Sie haben das Recht, Ihre personenbezogenen Daten in einem
                strukturierten, g&auml;ngigen und maschinenlesbaren Format zu
                erhalten. Die Anwendung bietet eine Exportfunktion (JSON, CSV),
                mit der Sie Ihre Daten jederzeit herunterladen k&ouml;nnen.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                11.6 Widerspruchsrecht (Art. 21 DSGVO)
              </h3>
              <p>
                Sie haben das Recht, aus Gr&uuml;nden, die sich aus Ihrer
                besonderen Situation ergeben, jederzeit gegen die Verarbeitung Sie
                betreffender personenbezogener Daten Widerspruch einzulegen, sofern
                die Verarbeitung auf Art. 6 Abs. 1 lit. f DSGVO (berechtigte
                Interessen) gest&uuml;tzt wird.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                11.7 Beschwerderecht bei einer Aufsichtsbeh&ouml;rde
              </h3>
              <p>
                Sie haben gem&auml;&szlig; Art. 77 DSGVO das Recht, sich bei einer
                Aufsichtsbeh&ouml;rde zu beschweren, wenn Sie der Ansicht sind,
                dass die Verarbeitung Ihrer personenbezogenen Daten gegen die DSGVO
                verst&ouml;&szlig;t. Sie k&ouml;nnen sich hierf&uuml;r
                insbesondere an die Aufsichtsbeh&ouml;rde Ihres
                Aufenthaltsorts, Arbeitsplatzes oder des Ortes des mutma&szlig;lichen
                Versto&szlig;es wenden.
              </p>
            </div>
          </div>
        </div>

        {/* 12. Loeschung von Daten */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            12. L&ouml;schung von Daten
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Die bei uns gespeicherten Daten werden gel&ouml;scht, sobald sie
              f&uuml;r ihre Zweckbestimmung nicht mehr erforderlich sind und der
              L&ouml;schung keine gesetzlichen Aufbewahrungspflichten
              entgegenstehen.
            </p>
            <p>
              Sie k&ouml;nnen Ihr Konto und s&auml;mtliche damit verbundene Daten
              jederzeit wie folgt l&ouml;schen:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                &Uuml;ber die Kontoeinstellungen in der Anwendung (Konto
                l&ouml;schen)
              </li>
              <li>
                Durch eine E-Mail an{' '}
                <a
                  href="mailto:martin.pfeffer@celox.io"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  martin.pfeffer@celox.io
                </a>{' '}
                mit dem Betreff &bdquo;Kontol&ouml;schung&ldquo;
              </li>
            </ul>
            <p>
              Bei der Kontol&ouml;schung werden alle Ihre personenbezogenen
              Daten, Spielerprofile, Spielstatistiken, Trainings-Daten und
              Achievements unwiderruflich gel&ouml;scht.
            </p>
          </div>
        </div>

        {/* 13. Mindestalter */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            13. Mindestalter
          </h2>
          <p className="text-dark-300">
            Die Nutzung unserer Anwendung setzt ein Mindestalter von 16 Jahren
            voraus (Art. 8 DSGVO). Personen unter 16 Jahren d&uuml;rfen die
            Anwendung nur mit Zustimmung eines Erziehungsberechtigten nutzen. Wir
            erheben wissentlich keine personenbezogenen Daten von Kindern unter 16
            Jahren.
          </p>
        </div>

        {/* 14. Aenderung der Datenschutzerklaerung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            14. &Auml;nderung dieser Datenschutzerkl&auml;rung
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Wir behalten uns vor, diese Datenschutzerkl&auml;rung anzupassen,
              damit sie stets den aktuellen rechtlichen Anforderungen entspricht
              oder um &Auml;nderungen unserer Leistungen umzusetzen. F&uuml;r
              Ihren erneuten Besuch gilt dann die neue
              Datenschutzerkl&auml;rung.
            </p>
          </div>
        </div>

        <div className="text-center text-dark-500 text-sm mt-8 mb-4">
          Stand: Februar 2026
        </div>
      </div>
    </div>
  );
};

export default Datenschutz;
