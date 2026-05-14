// I18n — central translation store and language management.
//
// Instantiated exactly once at the entry point (`const theI18n = new I18n()`)
// and passed by reference to every consumer (DI, not Singleton — see
// T_CONTRACT.md section 1). To add a language, add an entry to STRINGS;
// to switch at runtime, call .setLanguage(code). Subscribers are notified.

class I18n {
  constructor() {
    this.lang = 'en';
    this._listeners = [];
    this.strings = {
      en: {
        title:          "Knight's Tour",
        clickPrompt:    'Click any square.',
        solution:       (n) => `Solution found after ${n} steps.`,
        noSolution:     (n) => `No solution found after ${n} steps.`,
        langLabel:      'Language',
        heuristicLabel: 'Heuristic',
        figureLabel:    'Figure',
        mixBtn:         'Shuffle order',
        numbersLabel:   'Numbers',
        linesLabel:     'Lines',
        closedLabel:    'Closed',
        symmetryLabel:  'Symmetry',
        heur_warnsdorff: 'Warnsdorff',
        heur_outsideIn:  'Outside-In',
        heur_bruteForce: 'Brute Force',
        fig_1_2: '(1, 2) Knight',
        fig_1_4: '(1, 4) Camel',
        fig_2_3: '(2, 3) Zebra',
        fig_3_4: '(3, 4) Giraffe',
        sym_none:  '—',
        sym_axisV: 'Axis (V)',
        sym_point: 'Point',
        sym_rot90: 'Rotation 90°',
        cellLabel:    (c, r) => `Column ${c}, row ${r}`,
        boardLabel:   'Chess board',
        resetTooltip: 'Click to reset all settings to defaults',
        timeBudgetLabel: 'Time budget (s)',
        stopBtn:      'Stop',
        searching:    (n, sec) => `Searching… ${n} steps, ${sec.toFixed(1)} s`,
        aborted:      (sec, n) => `Aborted after ${sec.toFixed(1)} s, ${n} steps.`,
        stopped:      (n) => `Stopped after ${n} steps.`,
        sensitivityBtn: 'Sensitivity',
        sensitivityRunning: (i, n) => `Sensitivity: cell ${i}/${n}`,
        sensitivityDone:    (n)    => `Sensitivity computed for ${n} cells.`,
      },
      de: {
        title:          "Knight's Tour",
        clickPrompt:    'Klicke auf ein Feld.',
        solution:       (n) => `Lösung nach ${n} Schritten.`,
        noSolution:     (n) => `Keine Lösung nach ${n} Schritten.`,
        langLabel:      'Sprache',
        heuristicLabel: 'Heuristik',
        figureLabel:    'Figur',
        mixBtn:         'Reihenfolge mischen',
        numbersLabel:   'Nummern',
        linesLabel:     'Linien',
        closedLabel:    'Geschlossen',
        symmetryLabel:  'Symmetrie',
        heur_warnsdorff: 'Warnsdorff',
        heur_outsideIn:  'Outside-In',
        heur_bruteForce: 'Brute Force',
        fig_1_2: '(1, 2) Springer',
        fig_1_4: '(1, 4) Kamel',
        fig_2_3: '(2, 3) Zebra',
        fig_3_4: '(3, 4) Giraffe',
        sym_none:  '—',
        sym_axisV: 'Achse (V)',
        sym_point: 'Punkt',
        sym_rot90: 'Rotation 90°',
        cellLabel:    (c, r) => `Spalte ${c}, Reihe ${r}`,
        boardLabel:   'Schachbrett',
        resetTooltip: 'Klicke zum Zurücksetzen aller Einstellungen',
        timeBudgetLabel: 'Zeit-Limit (s)',
        stopBtn:      'Stopp',
        searching:    (n, sec) => `Suche läuft… ${n} Schritte, ${sec.toFixed(1)} s`,
        aborted:      (sec, n) => `Abgebrochen nach ${sec.toFixed(1)} s, ${n} Schritten.`,
        stopped:      (n) => `Gestoppt nach ${n} Schritten.`,
        sensitivityBtn: 'Sensitivität',
        sensitivityRunning: (i, n) => `Sensitivität: Feld ${i}/${n}`,
        sensitivityDone:    (n)    => `Sensitivität berechnet für ${n} Felder.`,
      },
    };
  }

  setLanguage(code) {
    if (!this.strings[code] || this.lang === code) return;
    this.lang = code;
    document.documentElement.lang = code;
    document.title = this.t('title');
    this._notify();
  }

  getLanguage() { return this.lang; }

  availableLanguages() { return Object.keys(this.strings); }

  t(key, ...args) {
    const value = this.strings[this.lang] && this.strings[this.lang][key];
    if (typeof value === 'function') return value(...args);
    return value !== undefined ? value : key;
  }

  subscribe(fn) { this._listeners.push(fn); }

  _notify() {
    for (const fn of this._listeners) fn();
  }
}
