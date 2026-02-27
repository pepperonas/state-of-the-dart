import React, { useState } from 'react';
import { X, Target, Users, TrendingUp, Trophy, Dumbbell, Settings, Award, Shield, Bug, ChevronRight, Play, Gamepad2, BarChart3, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UserGuideModalProps {
  onClose: () => void;
}

type GuideSection =
  | 'overview'
  | 'quickstart'
  | 'game'
  | 'players'
  | 'training'
  | 'stats'
  | 'achievements'
  | 'settings'
  | 'admin'
  | 'tips';

const UserGuideModal: React.FC<UserGuideModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<GuideSection>('overview');

  const sections = [
    { id: 'overview' as GuideSection, title: 'Übersicht', icon: Target },
    { id: 'quickstart' as GuideSection, title: 'Schnellstart', icon: Play },
    { id: 'game' as GuideSection, title: 'Spiel-Modi', icon: Gamepad2 },
    { id: 'players' as GuideSection, title: 'Spieler-Verwaltung', icon: Users },
    { id: 'training' as GuideSection, title: 'Training', icon: Dumbbell },
    { id: 'stats' as GuideSection, title: 'Statistiken', icon: TrendingUp },
    { id: 'achievements' as GuideSection, title: 'Achievements', icon: Award },
    { id: 'settings' as GuideSection, title: 'Einstellungen', icon: Settings },
    { id: 'admin' as GuideSection, title: 'Admin-Panel', icon: Shield },
    { id: 'tips' as GuideSection, title: 'Tipps & Tricks', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Willkommen bei State of the Dart! 🎯</h3>
            <p className="text-dark-300 leading-relaxed">
              State of the Dart ist eine professionelle Dart-Scoring-App mit umfangreichen Features für Spieler aller Levels.
              Von einfachen Matches bis hin zu kompletten Turnieren – alles ist möglich.
            </p>

            <div className="glass-card p-4 rounded-lg bg-primary-500/10 border border-primary-500/30">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Target size={20} className="text-primary-400" />
                Hauptfunktionen
              </h4>
              <ul className="space-y-2 text-dark-300">
                <li>• <strong>Multiple Spiel-Modi:</strong> 501, Cricket, Around the Clock und mehr</li>
                <li>• <strong>KI-Gegner:</strong> 10 Schwierigkeitsstufen für Solo-Training</li>
                <li>• <strong>Detaillierte Statistiken:</strong> Heatmaps, Averages, Checkout-Rate</li>
                <li>• <strong>Trainingsmodi:</strong> Doubles, Triples, Checkout-Training</li>
                <li>• <strong>Achievements:</strong> 145+ freischaltbare Erfolge in 7 Kategorien</li>
                <li>• <strong>Multi-Tenant:</strong> Mehrere Profile (Familie, Verein, etc.)</li>
                <li>• <strong>Audio-Caller:</strong> Professionelle Ansagen wie im TV</li>
              </ul>
            </div>

            <div className="glass-card p-4 rounded-lg bg-accent-500/10 border border-accent-500/30">
              <h4 className="font-semibold text-white mb-2">💡 Tipp für Einsteiger</h4>
              <p className="text-dark-300">
                Starte mit einem <strong>Quick Match</strong> gegen einen Bot, um die App kennenzulernen.
                Die KI-Gegner passen sich deinem Skill-Level an!
              </p>
            </div>
          </div>
        );

      case 'quickstart':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Schnellstart-Anleitung 🚀</h3>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Spieler erstellen</h4>
                    <p className="text-dark-300 text-sm">
                      Gehe zu <strong>Spieler</strong> → <strong>+ Neuer Spieler</strong>.
                      Wähle einen Namen und Avatar. Spieler-Statistiken werden automatisch getrackt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Match starten</h4>
                    <p className="text-dark-300 text-sm">
                      Klicke auf <strong>Quick Match</strong> → Wähle Spieler → Wähle Spielmodus (z.B. 501) → <strong>Spiel starten</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Würfe eingeben</h4>
                    <p className="text-dark-300 text-sm">
                      Klicke auf der Dartscheibe die getroffenen Felder an. Nach 3 Darts → <strong>Bestätigen</strong>.
                      Die App berechnet automatisch Scores, Averages und mehr.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Statistiken ansehen</h4>
                    <p className="text-dark-300 text-sm">
                      Nach dem Match: <strong>Statistiken</strong> → Sieh Heatmaps, Charts, Averages und mehr!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 rounded-lg bg-success-500/10 border border-success-500/30">
              <p className="text-success-300 text-sm">
                <strong>✓ Fertig!</strong> Du bist bereit für dein erstes Match. Viel Erfolg! 🎯
              </p>
            </div>
          </div>
        );

      case 'game':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Spiel-Modi 🎮</h3>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Target className="text-primary-400" size={20} />
                  501 (Standard)
                </h4>
                <p className="text-dark-300 text-sm mb-3">
                  Jeder Spieler startet mit 501 Punkten. Ziel: Auf exakt 0 runterzählen.
                  Letzter Dart muss ein Doppel sein (Double-Out).
                </p>
                <div className="bg-dark-800/50 p-3 rounded-lg space-y-1 text-xs text-dark-300">
                  <p><strong>Einstellungen:</strong></p>
                  <p>• First to: Anzahl Legs zum Gewinnen (Best of 3, 5, 7, etc.)</p>
                  <p>• Double Out: Erforderlich (Standard) oder Deaktiviert</p>
                  <p>• Sets: Optional, für längere Matches</p>
                </div>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Cricket</h4>
                <p className="text-dark-300 text-sm mb-2">
                  Strategie-Spiel: Schließe Zahlen 15-20 + Bull. Punkte sammeln durch offene Zahlen.
                </p>
                <div className="bg-dark-800/50 p-3 rounded-lg space-y-1 text-xs text-dark-300">
                  <p>• 3 Treffer schließen eine Zahl</p>
                  <p>• Weitere Treffer bringen Punkte (nur wenn Gegner noch offen)</p>
                  <p>• Gewinner: Alle Zahlen geschlossen + meiste Punkte</p>
                </div>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Around the Clock</h4>
                <p className="text-dark-300 text-sm">
                  Treffe alle Zahlen von 1-20 in Reihenfolge. Schnellster gewinnt!
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Gamepad2 className="text-amber-400" size={20} />
                  KI-Gegner (Bots)
                </h4>
                <p className="text-dark-300 text-sm mb-2">
                  Trainiere gegen adaptive KI mit 10 Schwierigkeitsstufen:
                </p>
                <ul className="text-dark-300 text-xs space-y-1">
                  <li>• <strong>Level 1-3:</strong> Anfänger (30-50 Average)</li>
                  <li>• <strong>Level 4-6:</strong> Amateur (50-70 Average)</li>
                  <li>• <strong>Level 7-8:</strong> Fortgeschritten (70-85 Average)</li>
                  <li>• <strong>Level 9-10:</strong> Profi (85-100 Average)</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'players':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Spieler-Verwaltung 👥</h3>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Spieler erstellen</h4>
                <p className="text-dark-300 text-sm mb-3">
                  <strong>Spieler</strong> → <strong>+ Neuer Spieler</strong>
                </p>
                <ul className="text-dark-300 text-sm space-y-1">
                  <li>• Name eingeben</li>
                  <li>• <strong>Emoji wählen:</strong> WhatsApp-Style Emoji-Picker mit 8 Kategorien</li>
                  <li>• Emoji ersetzt den Anfangsbuchstaben als Avatar</li>
                  <li>• Optional: Als Bot markieren mit Schwierigkeitslevel</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Haupt-Profil (Main Player)</h4>
                <p className="text-dark-300 text-sm mb-2">
                  Setze einen Spieler als Haupt-Profil, um dessen Stats im Dashboard zu sehen.
                </p>
                <p className="text-dark-300 text-sm">
                  <strong>Klicke auf die Krone</strong> 👑 neben einem Spieler, um ihn als Main Player zu setzen.
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Spieler-Profile</h4>
                <p className="text-dark-300 text-sm mb-3">
                  <strong>Klicke auf einen Spieler-Eintrag</strong> in der Liste, um sein vollständiges Profil zu sehen:
                </p>
                <ul className="text-dark-300 text-sm space-y-1">
                  <li>• <strong>Statistiken:</strong> Average, 180s, Checkout-Rate</li>
                  <li>• <strong>Heatmap:</strong> L.A. Style Heatmap mit smooth Blur-Effekten</li>
                  <li>• <strong>Match History:</strong> Alle gespielten Matches</li>
                  <li>• <strong>Personal Bests:</strong> Beste Leistungen</li>
                  <li>• <strong>Avatar:</strong> Professionelles Design mit geschwungener Schrift oder Emoji</li>
                </ul>
                <p className="text-dark-300 text-sm mt-2">
                  💡 <strong>Tipp:</strong> Der gesamte Listeneintrag ist klickbar - nicht nur das Auge-Icon!
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg bg-primary-500/10 border border-primary-500/30">
                <h4 className="font-semibold text-white mb-2">🔍 Suchfunktion & Pagination</h4>
                <p className="text-dark-300 text-sm mb-2">
                  <strong>Suche nach Spielern:</strong> Nutze das Suchfeld, um schnell einen Spieler zu finden.
                </p>
                <p className="text-dark-300 text-sm mb-2">
                  <strong>Blättere durch Seiten:</strong> Wähle 10/20/50/100 Items pro Seite und nutze die Navigation, um durch große Listen zu blättern.
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <h4 className="font-semibold text-white mb-2">💡 Tipp: Multi-Tenant</h4>
                <p className="text-dark-300 text-sm">
                  Du kannst mehrere <strong>Profile/Tenants</strong> erstellen (z.B. Familie, Verein, Freunde).
                  Wechsle zwischen Profilen in den <strong>Einstellungen</strong>.
                </p>
              </div>
            </div>
          </div>
        );

      case 'training':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Trainingsmodi 🏋️</h3>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Doubles Training</h4>
                <p className="text-dark-300 text-sm">
                  Trainiere alle Doppel von D1 bis D20. Verbessere deine Checkout-Skills!
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Triples Training</h4>
                <p className="text-dark-300 text-sm">
                  Trainiere alle Tripel von T20 bis T1. Perfektioniere deine hohen Scores.
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Around the Clock</h4>
                <p className="text-dark-300 text-sm">
                  Triff alle Zahlen 1-20 in Reihenfolge. Jedes Segment zählt (Single, Double, Triple).
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Checkout Training</h4>
                <p className="text-dark-300 text-sm">
                  Übe häufige Checkout-Kombinationen (40, 60, 80, etc.). Verbessere deine Finish-Rate!
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Bob's 27</h4>
                <p className="text-dark-300 text-sm mb-2">
                  Starte mit 27 Punkten. Zielzahl treffen: +3 Punkte. Verfehlen: -3 Punkte.
                </p>
                <p className="text-dark-300 text-sm">
                  <strong>Ziel:</strong> Punkte nicht auf 0 fallen lassen!
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Score Training</h4>
                <p className="text-dark-300 text-sm">
                  Erziele 60+ Punkte pro Wurf. Baue Konstanz und Power auf!
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg bg-success-500/10 border border-success-500/30">
                <h4 className="font-semibold text-white mb-2">📊 Training-Stats</h4>
                <p className="text-dark-300 text-sm">
                  Alle Training-Sessions werden gespeichert und in deiner <strong>Heatmap</strong> berücksichtigt!
                  Sieh deinen Fortschritt in den Statistiken.
                </p>
              </div>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Statistiken & Analytics 📊</h3>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Heatmap</h4>
                <p className="text-dark-300 text-sm mb-2">
                  Visuelle Darstellung aller deiner Würfe. Sieh auf einen Blick:
                </p>
                <ul className="text-dark-300 text-sm space-y-1">
                  <li>• Welche Felder du am häufigsten triffst</li>
                  <li>• Deine Stärken und Schwächen</li>
                  <li>• Trefferverteilung über alle Matches</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Average-Charts</h4>
                <p className="text-dark-300 text-sm">
                  Verfolge deine Average-Entwicklung über Zeit. Filter nach Zeitraum (7/30/90/365 Tage).
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Checkout-Statistiken</h4>
                <p className="text-dark-300 text-sm mb-2">
                  Detaillierte Checkout-Analyse:
                </p>
                <ul className="text-dark-300 text-sm space-y-1">
                  <li>• Checkout-Prozentsatz</li>
                  <li>• Häufigste Checkouts</li>
                  <li>• Beste Checkout-Kombinationen</li>
                  <li>• Checkout-Verteilung nach Doppel-Feld</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Match History</h4>
                <p className="text-dark-300 text-sm mb-2">
                  Alle gespielten Matches mit Details: Gegner, Score, Datum, Average, 180s.
                  Klicke auf ein Match für detaillierte Statistiken.
                </p>
                <ul className="text-dark-300 text-sm space-y-1 mt-2">
                  <li>• <strong>Suchfunktion:</strong> Suche nach Gegner, Datum oder Spieltyp</li>
                  <li>• <strong>Pagination:</strong> Blättere durch Seiten (10/20/50/100 pro Seite)</li>
                  <li>• <strong>Wurfverlauf:</strong> Im Detail-Modal siehst du alle Würfe pro Spieler</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg bg-primary-500/10 border border-primary-500/30">
                <h4 className="font-semibold text-white mb-2">📈 Export-Funktion</h4>
                <p className="text-dark-300 text-sm">
                  Exportiere deine Stats in verschiedenen Formaten: CSV, Excel, PDF, JSON.
                  Perfekt für eigene Analysen!
                </p>
              </div>
            </div>
          </div>
        );

      case 'achievements':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Achievements & Erfolge 🏆</h3>

            <p className="text-dark-300">
              Schalte <strong>145+ Achievements</strong> frei, indem du bestimmte Meilensteine erreichst!
            </p>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Achievement-Kategorien</h4>
                <ul className="text-dark-300 text-sm space-y-2">
                  <li>• <strong>Einsteiger:</strong> Erste Schritte (Erstes Match, Erster Sieg)</li>
                  <li>• <strong>Skill-Based:</strong> 180, 171+, hohe Checkouts</li>
                  <li>• <strong>Konsistenz:</strong> Win Streaks, Perfect Legs</li>
                  <li>• <strong>Milestones:</strong> 100 Matches, 1000 180s</li>
                  <li>• <strong>Special:</strong> 9-Darter, Bullseye-Finish</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Achievement-Beispiele</h4>
                <div className="space-y-3">
                  <div className="bg-dark-800/50 p-3 rounded-lg">
                    <p className="text-white font-semibold">🎯 Erste Schritte</p>
                    <p className="text-dark-300 text-sm">Erstes Match abgeschlossen</p>
                  </div>
                  <div className="bg-dark-800/50 p-3 rounded-lg">
                    <p className="text-white font-semibold">💯 Century</p>
                    <p className="text-dark-300 text-sm">100+ Punkte in einem Wurf</p>
                  </div>
                  <div className="bg-dark-800/50 p-3 rounded-lg">
                    <p className="text-white font-semibold">⚡ Maximum</p>
                    <p className="text-dark-300 text-sm">180 Punkte (3x T20)</p>
                  </div>
                  <div className="bg-dark-800/50 p-3 rounded-lg">
                    <p className="text-white font-semibold">🔥 Hot Streak</p>
                    <p className="text-dark-300 text-sm">5 Spiele in Folge gewonnen</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <h4 className="font-semibold text-white mb-2">🏅 Benachrichtigungen</h4>
                <p className="text-dark-300 text-sm">
                  Achievements werden während des Spiels automatisch freigeschaltet und angezeigt!
                  Aktiviere Sound & Benachrichtigungen in den Einstellungen.
                </p>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Einstellungen ⚙️</h3>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Audio & Sound</h4>
                <ul className="text-dark-300 text-sm space-y-1">
                  <li>• <strong>Caller Volume:</strong> Professionelle Ansagen (Scores, Checkouts)</li>
                  <li>• <strong>Effects Volume:</strong> Dart-Treffer, Erfolge</li>
                  <li>• <strong>Getrennte Lautstärke:</strong> Caller und Effekte separat regelbar</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Theme / Aussehen</h4>
                <p className="text-dark-300 text-sm">
                  Wähle zwischen <strong>Dark Mode</strong> und <strong>Light Mode</strong>.
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Sprache</h4>
                <p className="text-dark-300 text-sm">
                  Verfügbare Sprachen: <strong>Deutsch</strong> und <strong>English</strong>.
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Progressive Web App (PWA)</h4>
                <p className="text-dark-300 text-sm mb-2">
                  Installiere die App auf deinem Gerät:
                </p>
                <ul className="text-dark-300 text-sm space-y-1">
                  <li>• <strong>iOS:</strong> Safari → Teilen → "Zum Home-Bildschirm"</li>
                  <li>• <strong>Android:</strong> Chrome → Menü → "App installieren"</li>
                  <li>• <strong>Desktop:</strong> Chrome/Edge → Adresszeile → Install-Icon</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Daten-Management</h4>
                <ul className="text-dark-300 text-sm space-y-1">
                  <li>• <strong>Profile/Tenants:</strong> Wechsle zwischen verschiedenen Profilen</li>
                  <li>• <strong>Neues Profil:</strong> Erstelle separate Umgebungen</li>
                  <li>• <strong>Demo-Daten:</strong> Generiere Test-Daten zum Ausprobieren</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <h4 className="font-semibold text-white mb-2">⚠️ Gefahrenzone</h4>
                <p className="text-dark-300 text-sm">
                  <strong>Alle Daten löschen:</strong> Vorsicht! Löscht alle Matches, Spieler und Statistiken unwiderruflich.
                </p>
              </div>
            </div>
          </div>
        );

      case 'admin':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Admin-Panel 👑</h3>

            <div className="glass-card p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-300 text-sm">
                <strong>Hinweis:</strong> Dieser Bereich ist nur für Administratoren sichtbar.
              </p>
            </div>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Benutzer-Verwaltung</h4>
                <ul className="text-dark-300 text-sm space-y-1">
                  <li>• Alle registrierten Benutzer anzeigen</li>
                  <li>• Subscription-Status verwalten</li>
                  <li>• Lifetime-Zugang gewähren</li>
                  <li>• Zugang entziehen</li>
                  <li>• Admin-Rechte vergeben/entfernen</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Abonnement-Verwaltung</h4>
                <p className="text-dark-300 text-sm mb-2">
                  Vollständige Kontrolle über Subscriptions:
                </p>
                <ul className="text-dark-300 text-sm space-y-1">
                  <li>• Status ändern: Active, Trial, Expired, Lifetime</li>
                  <li>• Plan ändern: Monthly, Annual, Lifetime</li>
                  <li>• Ablaufdatum setzen</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Bug-Report-Verwaltung</h4>
                <ul className="text-dark-300 text-sm space-y-1">
                  <li>• Alle Bug-Reports einsehen</li>
                  <li>• Status ändern: Open → In Progress → Resolved</li>
                  <li>• Admin-Notizen hinzufügen</li>
                  <li>• Reports löschen</li>
                  <li>• Filter nach Status/Severity</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Statistiken</h4>
                <p className="text-dark-300 text-sm">
                  Übersicht: Gesamtanzahl User, Active Subscriptions, Trial User, Expired User.
                </p>
              </div>
            </div>
          </div>
        );

      case 'tips':
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Tipps & Tricks 💡</h3>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">🎯 Für Anfänger</h4>
                <ul className="text-dark-300 text-sm space-y-2">
                  <li>• Starte mit <strong>Bot-Gegnern Level 1-3</strong> zum Üben</li>
                  <li>• Nutze <strong>Trainingsmodi</strong> um spezifische Skills zu verbessern</li>
                  <li>• Sieh dir die <strong>Checkout-Tabelle</strong> an (im Spiel angezeigt)</li>
                  <li>• Aktiviere <strong>Audio-Caller</strong> für besseres Feedback</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">📊 Stats nutzen</h4>
                <ul className="text-dark-300 text-sm space-y-2">
                  <li>• Prüfe deine <strong>Heatmap</strong> um Schwächen zu erkennen</li>
                  <li>• Verfolge deine <strong>Average-Entwicklung</strong> über Zeit</li>
                  <li>• Analysiere deine <strong>Checkout-Rate</strong> pro Doppel</li>
                  <li>• Exportiere Stats für eigene Analysen</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">⚡ Schnelle Eingabe & Undo</h4>
                <ul className="text-dark-300 text-sm space-y-2">
                  <li>• Nach 3 Darts wird automatisch bestätigt (600ms Delay)</li>
                  <li>• <strong>Undo-Button:</strong> Macht den letzten Wurf rückgängig</li>
                  <li>• <strong>Undo Match-Ende:</strong> Versehentlich beendete Matches können fortgesetzt werden</li>
                  <li>• <strong>Verlaufsanzeige:</strong> Beim Undo wird ein Preview-Panel mit entfernten Würfen angezeigt</li>
                  <li>• <strong>Statistik-Neuberechnung:</strong> Alle Stats werden beim Undo korrekt aktualisiert</li>
                  <li>• Klicke <strong>"Verfehlt"</strong> für Fehlwürfe (0 Punkte)</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">🏆 Achievements farmen</h4>
                <ul className="text-dark-300 text-sm space-y-2">
                  <li>• Spiele verschiedene Modi für unterschiedliche Achievements</li>
                  <li>• Nutze <strong>Training</strong> für skill-basierte Erfolge</li>
                  <li>• Sieh dir die <strong>Achievement-Liste</strong> an für Inspiration</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <h4 className="font-semibold text-white mb-2">🐛 Probleme melden</h4>
                <p className="text-dark-300 text-sm">
                  Bug gefunden? Nutze den <strong>Bug-Report-Button</strong> (neben Undo im Spiel).
                  Screenshots werden automatisch erstellt!
                </p>
              </div>

              <div className="glass-card p-4 rounded-lg bg-success-500/10 border border-success-500/30">
                <h4 className="font-semibold text-white mb-2">✨ Pro-Tipp</h4>
                <p className="text-dark-300 text-sm">
                  Erstelle separate <strong>Tenants/Profile</strong> für verschiedene Szenarien:
                  Familie, Verein, Solo-Training. So bleiben deine Stats organisiert!
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass-card rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="text-primary-400" size={32} />
            Anleitung
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar: horizontal scroll on mobile, vertical sidebar on md+ */}
          <div className="border-b md:border-b-0 md:border-r border-dark-700 md:w-64 overflow-x-auto md:overflow-x-visible md:overflow-y-auto p-2 md:p-4 bg-dark-900/30 flex-shrink-0">
            <nav className="flex md:flex-col gap-1 md:gap-1 min-w-max md:min-w-0">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all text-left whitespace-nowrap md:whitespace-normal md:w-full ${
                      activeSection === section.id
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'text-dark-300 hover:bg-dark-800/50 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0 md:[&]:w-5 md:[&]:h-5" />
                    <span className="font-medium text-sm md:text-base">{section.title}</span>
                    {activeSection === section.id && (
                      <ChevronRight size={16} className="ml-auto hidden md:block" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuideModal;
