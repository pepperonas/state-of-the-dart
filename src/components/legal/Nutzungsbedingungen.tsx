import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Nutzungsbedingungen: React.FC = () => {
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
          Allgemeine Nutzungsbedingungen
        </h1>

        {/* 1. Geltungsbereich */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            1. Geltungsbereich
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Diese Allgemeinen Nutzungsbedingungen (nachfolgend
              &bdquo;Nutzungsbedingungen&ldquo;) regeln die Nutzung der
              Webanwendung &bdquo;State of the Dart&ldquo; (nachfolgend
              &bdquo;Anwendung&ldquo; oder &bdquo;Dienst&ldquo;), erreichbar
              unter{' '}
              <a
                href="https://stateofthedart.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 transition-colors"
              >
                https://stateofthedart.com
              </a>
              , betrieben von:
            </p>
            <div className="mt-2">
              <p>celox</p>
              <p>Martin Pfeffer</p>
              <p>Flughafenstra&szlig;e 24</p>
              <p>12053 Berlin</p>
              <p>
                E-Mail:{' '}
                <a
                  href="mailto:martin.pfeffer@celox.io"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  martin.pfeffer@celox.io
                </a>
              </p>
            </div>
            <p>
              Mit der Registrierung und Nutzung der Anwendung erkl&auml;ren Sie
              sich mit diesen Nutzungsbedingungen einverstanden. Sofern Sie den
              Nutzungsbedingungen nicht zustimmen, d&uuml;rfen Sie die Anwendung
              nicht nutzen.
            </p>
          </div>
        </div>

        {/* 2. Leistungsbeschreibung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            2. Leistungsbeschreibung
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              &bdquo;State of the Dart&ldquo; ist eine Progressive Web App (PWA)
              zur professionellen Erfassung und Auswertung von Dart-Spielen. Die
              Anwendung bietet unter anderem folgende Funktionen:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Erfassung von Dart-Spielen (X01, Cricket, Around the Clock, Shanghai)</li>
              <li>Spielerstatistiken und Auswertungen</li>
              <li>Trainingsmodi (Doppel, Tripel, Checkout, Bob's 27 u.a.)</li>
              <li>Achievement-System</li>
              <li>Leaderboards (lokal und global)</li>
              <li>Mehrspieler-Unterst&uuml;tzung</li>
              <li>Bot-Gegner mit verschiedenen Schwierigkeitsgraden</li>
              <li>Datenexport (JSON, CSV, XLSX, PDF)</li>
              <li>Offline-F&auml;higkeit (PWA)</li>
            </ul>
            <p>
              Der Betreiber beh&auml;lt sich vor, den Funktionsumfang der
              Anwendung jederzeit zu &auml;ndern, zu erweitern oder
              einzuschr&auml;nken.
            </p>
          </div>
        </div>

        {/* 3. Registrierung und Konto */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            3. Registrierung und Benutzerkonto
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Die Nutzung der Anwendung erfordert eine Registrierung. Die
              Registrierung ist &uuml;ber E-Mail oder Google OAuth m&ouml;glich.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                Sie m&uuml;ssen mindestens <strong className="text-white">16 Jahre</strong> alt sein, um die Anwendung nutzen zu d&uuml;rfen.
              </li>
              <li>
                Sie sind verpflichtet, bei der Registrierung wahrheitsgem&auml;&szlig;e
                Angaben zu machen.
              </li>
              <li>
                Sie sind f&uuml;r die Geheimhaltung Ihrer Zugangsdaten selbst
                verantwortlich und haften f&uuml;r alle Aktivit&auml;ten, die unter
                Ihrem Konto stattfinden.
              </li>
              <li>
                Bei Verdacht auf unbefugte Nutzung Ihres Kontos sind Sie
                verpflichtet, uns unverz&uuml;glich zu informieren.
              </li>
              <li>
                Pro Person darf nur ein Benutzerkonto erstellt werden.
              </li>
            </ul>
          </div>
        </div>

        {/* 4. Kostenlose Testphase und Abonnement */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            4. Kostenlose Testphase und Abonnement
          </h2>
          <div className="text-dark-300 space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                4.1 Kostenlose Testphase
              </h3>
              <p>
                Neue Nutzer erhalten nach der Registrierung eine kostenlose
                Testphase (Trial), w&auml;hrend der s&auml;mtliche Funktionen der
                Anwendung uneingeschr&auml;nkt verf&uuml;gbar sind. Die Dauer der
                Testphase wird bei der Registrierung angezeigt.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                4.2 Kostenpflichtiges Abonnement
              </h3>
              <p>
                Nach Ablauf der Testphase ist f&uuml;r die weitere Nutzung der
                vollst&auml;ndigen Funktionen ein kostenpflichtiges Abonnement
                erforderlich. Die aktuellen Preise und Abonnementoptionen werden
                auf der Preisseite der Anwendung angezeigt.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                4.3 Zahlungsabwicklung
              </h3>
              <p>
                Die Zahlungsabwicklung erfolgt &uuml;ber den Drittanbieter{' '}
                <strong className="text-white">Stripe, Inc.</strong> Es gelten
                zus&auml;tzlich die{' '}
                <a
                  href="https://stripe.com/de/legal/consumer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Nutzungsbedingungen von Stripe
                </a>
                .
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                4.4 Widerrufsrecht
              </h3>
              <p>
                Als Verbraucher steht Ihnen ein gesetzliches Widerrufsrecht zu.
                Sie k&ouml;nnen Ihre Vertragserkl&auml;rung innerhalb von 14 Tagen
                ohne Angabe von Gr&uuml;nden widerrufen. Die Widerrufsfrist
                betr&auml;gt 14 Tage ab dem Tag des Vertragsschlusses. Um Ihr
                Widerrufsrecht auszu&uuml;ben, informieren Sie uns per E-Mail an{' '}
                <a
                  href="mailto:martin.pfeffer@celox.io"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  martin.pfeffer@celox.io
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* 5. Pflichten des Nutzers */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            5. Pflichten des Nutzers
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>Der Nutzer verpflichtet sich:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                Die Anwendung nur f&uuml;r den vorgesehenen Zweck (Dart-Scoring
                und zugeh&ouml;rige Funktionen) zu nutzen.
              </li>
              <li>
                Keine rechtswidrigen, beleidigende oder anst&ouml;&szlig;ige
                Inhalte (z.B. in Spielernamen oder Bug-Reports) zu verbreiten.
              </li>
              <li>
                Keine Ma&szlig;nahmen zu ergreifen, die die Funktionsf&auml;higkeit
                der Anwendung beeintr&auml;chtigen k&ouml;nnten (z.B. &uuml;berm&auml;&szlig;ige
                Serveranfragen, Manipulationsversuche, Einschleusung von
                Schadcode).
              </li>
              <li>
                Keine automatisierten Zugriffe (Bots, Crawler, Scraper) auf die
                Anwendung oder die API durchzuf&uuml;hren, sofern nicht
                ausdr&uuml;cklich genehmigt.
              </li>
              <li>
                Die Leaderboard- und Achievement-Systeme nicht durch manipulierte
                Daten oder absichtliches Missbrauchen zu verf&auml;lschen.
              </li>
              <li>
                Die Rechte anderer Nutzer zu respektieren.
              </li>
            </ul>
          </div>
        </div>

        {/* 6. Geistiges Eigentum */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            6. Geistiges Eigentum und Urheberrecht
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Alle Inhalte der Anwendung, einschlie&szlig;lich aber nicht
              beschr&auml;nkt auf Texte, Grafiken, Logos, Icons, Audiodateien,
              Software und deren Zusammenstellung, sind Eigentum des Betreibers
              oder seiner Lizenzgeber und durch deutsches und internationales
              Urheberrecht gesch&uuml;tzt.
            </p>
            <p>
              Die Nutzung der Anwendung gew&auml;hrt Ihnen ein einfaches, nicht
              &uuml;bertragbares, nicht unterlizenzierbares Recht zur Nutzung der
              Anwendung f&uuml;r den vorgesehenen Zweck. Eine dar&uuml;ber
              hinausgehende Nutzung, insbesondere die Vervielf&auml;ltigung,
              Ver&ouml;ffentlichung oder Modifikation von Inhalten, bedarf der
              vorherigen schriftlichen Zustimmung des Betreibers.
            </p>
            <p>
              Die von Ihnen in der Anwendung erstellten Daten (Spielerprofile,
              Spielstatistiken etc.) verbleiben in Ihrem Eigentum. Sie
              gew&auml;hren dem Betreiber das Recht, diese Daten zur
              Bereitstellung des Dienstes zu verarbeiten und f&uuml;r
              anonymisierte, aggregierte Statistiken (z.B. globale Leaderboards) zu
              verwenden.
            </p>
          </div>
        </div>

        {/* 7. Verfuegbarkeit und Gew&auml;hrleistung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            7. Verf&uuml;gbarkeit und Gew&auml;hrleistung
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Der Betreiber bem&uuml;ht sich, die Anwendung m&ouml;glichst
              unterbrechungsfrei zur Verf&uuml;gung zu stellen. Ein Anspruch auf
              st&auml;ndige Verf&uuml;gbarkeit besteht jedoch nicht.
            </p>
            <p>
              Vor&uuml;bergehende Unterbrechungen aufgrund von Wartungsarbeiten,
              technischen St&ouml;rungen, h&ouml;herer Gewalt oder aus Gr&uuml;nden,
              die au&szlig;erhalb des Einflussbereichs des Betreibers liegen,
              begr&uuml;nden keinen Anspruch auf Schadensersatz oder
              Preisminderung.
            </p>
            <p>
              Die Anwendung wird &bdquo;wie besehen&ldquo; (as is) bereitgestellt.
              Der Betreiber &uuml;bernimmt keine Gew&auml;hrleistung f&uuml;r die
              Richtigkeit, Vollst&auml;ndigkeit oder Aktualit&auml;t der in der
              Anwendung angezeigten Daten.
            </p>
          </div>
        </div>

        {/* 8. Haftungsbeschraenkung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            8. Haftungsbeschr&auml;nkung
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Der Betreiber haftet unbeschr&auml;nkt f&uuml;r Sch&auml;den aus der
              Verletzung des Lebens, des K&ouml;rpers oder der Gesundheit sowie
              f&uuml;r vors&auml;tzlich oder grob fahrl&auml;ssig verursachte
              Sch&auml;den.
            </p>
            <p>
              Bei Verletzung wesentlicher Vertragspflichten
              (Kardinalpflichten), deren Erf&uuml;llung die ordnungsgem&auml;&szlig;e
              Durchf&uuml;hrung des Vertrages &uuml;berhaupt erst erm&ouml;glicht
              und auf deren Einhaltung der Nutzer regelm&auml;&szlig;ig vertrauen
              darf, haftet der Betreiber bei leichter Fahrl&auml;ssigkeit nur auf
              den vertragstypischen, vorhersehbaren Schaden.
            </p>
            <p>
              Im &Uuml;brigen ist die Haftung des Betreibers f&uuml;r leichte
              Fahrl&auml;ssigkeit ausgeschlossen. Dies gilt insbesondere f&uuml;r:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Datenverluste aufgrund technischer St&ouml;rungen</li>
              <li>
                Sch&auml;den durch nicht autorisierte Zugriffe auf
                Benutzerkonten, sofern der Betreiber angemessene
                Sicherheitsma&szlig;nahmen getroffen hat
              </li>
              <li>
                Sch&auml;den durch Ausfall oder Nichterreichbarkeit der
                Anwendung
              </li>
              <li>Entgangene Gewinne oder sonstige Folgesch&auml;den</li>
            </ul>
            <p>
              Die vorstehenden Haftungsbeschr&auml;nkungen gelten auch
              zugunsten der Erf&uuml;llungsgehilfen des Betreibers.
            </p>
          </div>
        </div>

        {/* 9. Sperrung und Kuendigung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            9. Sperrung und K&uuml;ndigung
          </h2>
          <div className="text-dark-300 space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                9.1 K&uuml;ndigung durch den Nutzer
              </h3>
              <p>
                Sie k&ouml;nnen Ihr Konto jederzeit &uuml;ber die
                Kontoeinstellungen l&ouml;schen oder uns per E-Mail an{' '}
                <a
                  href="mailto:martin.pfeffer@celox.io"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  martin.pfeffer@celox.io
                </a>{' '}
                kontaktieren. Ein laufendes Abonnement k&ouml;nnen Sie jederzeit
                zum Ende der aktuellen Abrechnungsperiode k&uuml;ndigen.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                9.2 Sperrung und K&uuml;ndigung durch den Betreiber
              </h3>
              <p>
                Der Betreiber beh&auml;lt sich vor, Benutzerkonten bei Verst&ouml;&szlig;en
                gegen diese Nutzungsbedingungen vor&uuml;bergehend zu sperren
                oder dauerhaft zu l&ouml;schen. Insbesondere bei:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                <li>Versto&szlig; gegen die Nutzerpflichten (Abschnitt 5)</li>
                <li>Missbrauch der Anwendung oder der API</li>
                <li>Bereitstellung falscher Registrierungsdaten</li>
                <li>Nichtbezahlung f&auml;lliger Betr&auml;ge</li>
              </ul>
              <p className="mt-2">
                Vor einer Sperrung oder K&uuml;ndigung wird der Nutzer in der
                Regel per E-Mail informiert, sofern nicht zwingende Gr&uuml;nde
                (z.B. Sicherheitsvorf&auml;lle) eine sofortige Sperrung
                erfordern.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                9.3 Folgen der K&uuml;ndigung
              </h3>
              <p>
                Nach K&uuml;ndigung und Ablauf etwaiger Aufbewahrungsfristen
                werden s&auml;mtliche Nutzerdaten gem&auml;&szlig; unserer{' '}
                <Link
                  to="/datenschutz"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Datenschutzerkl&auml;rung
                </Link>{' '}
                gel&ouml;scht. Wir empfehlen, vor der K&uuml;ndigung die
                Datenexport-Funktion der Anwendung zu nutzen.
              </p>
            </div>
          </div>
        </div>

        {/* 10. Datenschutz */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            10. Datenschutz
          </h2>
          <p className="text-dark-300">
            Die Verarbeitung personenbezogener Daten erfolgt gem&auml;&szlig;
            unserer{' '}
            <Link
              to="/datenschutz"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              Datenschutzerkl&auml;rung
            </Link>
            , die Bestandteil dieser Nutzungsbedingungen ist. Mit der Nutzung der
            Anwendung nehmen Sie die Datenschutzerkl&auml;rung zur Kenntnis.
          </p>
        </div>

        {/* 11. Aenderung der Nutzungsbedingungen */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            11. &Auml;nderung der Nutzungsbedingungen
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Der Betreiber beh&auml;lt sich vor, diese Nutzungsbedingungen
              jederzeit zu &auml;ndern. &Uuml;ber wesentliche &Auml;nderungen
              werden registrierte Nutzer per E-Mail informiert.
            </p>
            <p>
              Die fortgesetzte Nutzung der Anwendung nach In-Kraft-Treten
              ge&auml;nderter Nutzungsbedingungen gilt als Zustimmung zu den
              &Auml;nderungen. Bei Widerspruch steht es dem Nutzer frei, sein
              Konto zu l&ouml;schen.
            </p>
          </div>
        </div>

        {/* 12. Anwendbares Recht und Gerichtsstand */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            12. Anwendbares Recht und Gerichtsstand
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland unter
              Ausschluss des UN-Kaufrechts (CISG).
            </p>
            <p>
              Sind Sie Verbraucher, gelten dar&uuml;ber hinaus die zwingenden
              Verbraucherschutzvorschriften des Staates, in dem Sie Ihren
              gew&ouml;hnlichen Aufenthalt haben, sofern diese Ihnen einen
              weitergehenden Schutz bieten.
            </p>
            <p>
              Sofern Sie keinen allgemeinen Gerichtsstand in Deutschland haben
              oder nach Vertragsschluss Ihren Wohnsitz ins Ausland verlegt haben,
              ist der Sitz des Betreibers Gerichtsstand. Dies gilt nicht, wenn ein
              ausschlie&szlig;licher Gerichtsstand gesetzlich vorgeschrieben ist.
            </p>
          </div>
        </div>

        {/* 13. Salvatorische Klausel */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            13. Salvatorische Klausel
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Sollten einzelne Bestimmungen dieser Nutzungsbedingungen unwirksam
              oder undurchf&uuml;hrbar sein oder nach Vertragsschluss unwirksam
              oder undurchf&uuml;hrbar werden, so wird dadurch die Wirksamkeit
              der Nutzungsbedingungen im &Uuml;brigen nicht ber&uuml;hrt.
            </p>
            <p>
              An die Stelle der unwirksamen oder undurchf&uuml;hrbaren Bestimmung
              soll diejenige wirksame und durchf&uuml;hrbare Regelung treten,
              deren Wirkungen der wirtschaftlichen Zielsetzung am n&auml;chsten
              kommen, die die Vertragsparteien mit der unwirksamen bzw.
              undurchf&uuml;hrbaren Bestimmung verfolgt haben.
            </p>
          </div>
        </div>

        {/* 14. Kontakt */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">14. Kontakt</h2>
          <div className="text-dark-300 space-y-2">
            <p>
              Bei Fragen zu diesen Nutzungsbedingungen wenden Sie sich bitte an:
            </p>
            <p className="mt-2">
              E-Mail:{' '}
              <a
                href="mailto:martin.pfeffer@celox.io"
                className="text-primary-400 hover:text-primary-300 transition-colors"
              >
                martin.pfeffer@celox.io
              </a>
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

export default Nutzungsbedingungen;
