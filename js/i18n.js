// I18n — central translation store and language management.
//
// Singleton: I18n.getInstance(). To add a language, add an entry to STRINGS;
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
        heuristicLabel: 'Heuristic',
        figureLabel:    'Figure',
        mixBtn:         'Shuffle order',
        numbersLabel:   'Numbers',
        linesLabel:     'Lines',
        closedLabel:    'Closed',
        symmetryLabel:  'Symmetry',
      },
      de: {
        title:          "Knight's Tour",
        clickPrompt:    'Klicke auf ein Feld.',
        solution:       (n) => `Lösung nach ${n} Schritten.`,
        noSolution:     (n) => `Keine Lösung nach ${n} Schritten.`,
        heuristicLabel: 'Heuristik',
        figureLabel:    'Figur',
        mixBtn:         'Reihenfolge mischen',
        numbersLabel:   'Nummern',
        linesLabel:     'Linien',
        closedLabel:    'Geschlossen',
        symmetryLabel:  'Symmetrie',
      },
    };
  }

  static getInstance() {
    if (!I18n._instance) I18n._instance = new I18n();
    return I18n._instance;
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
