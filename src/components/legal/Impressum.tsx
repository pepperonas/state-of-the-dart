import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Impressum: React.FC = () => {
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

        <h1 className="text-3xl font-bold text-white mb-8">Impressum</h1>

        {/* Angaben gemaess § 5 TMG */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Angaben gem. &sect; 5 TMG
          </h2>
          <div className="text-dark-300 space-y-2">
            <p>celox</p>
            <p>Martin Pfeffer</p>
            <p>Flughafenstra&szlig;e 24</p>
            <p>12053 Berlin</p>
          </div>
        </div>

        {/* Kontakt */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Kontakt</h2>
          <div className="text-dark-300 space-y-2">
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
                href="https://celox.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 transition-colors"
              >
                https://celox.io
              </a>
            </p>
            <p>
              Anwendung:{' '}
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

        {/* Verantwortlich fuer den Inhalt */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Verantwortlich f&uuml;r den Inhalt gem. &sect; 18 Abs. 2 MStV
          </h2>
          <div className="text-dark-300 space-y-2">
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
        </div>

        {/* Datenschutzbeauftragter */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Datenschutzbeauftragter
          </h2>
          <div className="text-dark-300 space-y-2">
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
        </div>

        {/* EU-Streitschlichtung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            EU-Streitschlichtung
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Die Europ&auml;ische Kommission stellt eine Plattform zur
              Online-Streitbeilegung (OS) bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 transition-colors break-all"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p>
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </div>
        </div>

        {/* Verbraucherstreitbeilegung */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Verbraucherstreitbeilegung / Universalschlichtungsstelle
          </h2>
          <p className="text-dark-300">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
            vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>

        {/* Haftung fuer Inhalte */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Haftung f&uuml;r Inhalte
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Als Diensteanbieter sind wir gem&auml;&szlig; &sect; 7 Abs. 1 TMG
              f&uuml;r eigene Inhalte auf diesen Seiten nach den allgemeinen
              Gesetzen verantwortlich. Nach &sect;&sect; 8 bis 10 TMG sind wir als
              Diensteanbieter jedoch nicht verpflichtet, &uuml;bermittelte oder
              gespeicherte fremde Informationen zu &uuml;berwachen oder nach
              Umst&auml;nden zu forschen, die auf eine rechtswidrige
              T&auml;tigkeit hinweisen.
            </p>
            <p>
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
              Informationen nach den allgemeinen Gesetzen bleiben hiervon
              unber&uuml;hrt. Eine diesbez&uuml;gliche Haftung ist jedoch erst ab
              dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung
              m&ouml;glich. Bei Bekanntwerden von entsprechenden
              Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </p>
          </div>
        </div>

        {/* Haftung fuer Links */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Haftung f&uuml;r Links
          </h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Unser Angebot enth&auml;lt Links zu externen Websites Dritter, auf
              deren Inhalte wir keinen Einfluss haben. Deshalb k&ouml;nnen wir
              f&uuml;r diese fremden Inhalte auch keine Gew&auml;hr
              &uuml;bernehmen. F&uuml;r die Inhalte der verlinkten Seiten ist
              stets der jeweilige Anbieter oder Betreiber der Seiten
              verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
              Verlinkung auf m&ouml;gliche Rechtsverst&ouml;&szlig;e
              &uuml;berpr&uuml;ft. Rechtswidrige Inhalte waren zum Zeitpunkt der
              Verlinkung nicht erkennbar.
            </p>
            <p>
              Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist
              jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht
              zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir
              derartige Links umgehend entfernen.
            </p>
          </div>
        </div>

        {/* Urheberrecht */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Urheberrecht</h2>
          <div className="text-dark-300 space-y-3">
            <p>
              Die durch den Seitenbetreiber erstellten Inhalte und Werke auf
              diesen Seiten unterliegen dem deutschen Urheberrecht. Die
              Vervielf&auml;ltigung, Bearbeitung, Verbreitung und jede Art der
              Verwertung au&szlig;erhalb der Grenzen des Urheberrechtes
              bed&uuml;rfen der schriftlichen Zustimmung des jeweiligen Autors
              bzw. Erstellers. Downloads und Kopien dieser Seite sind nur f&uuml;r
              den privaten, nicht kommerziellen Gebrauch gestattet.
            </p>
            <p>
              Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt
              wurden, werden die Urheberrechte Dritter beachtet. Insbesondere
              werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie
              trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten
              wir um einen entsprechenden Hinweis. Bei Bekanntwerden von
              Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
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

export default Impressum;
