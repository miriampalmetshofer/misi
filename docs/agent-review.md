# Automatisches Codex-Review für Misi

Die projektlokale `.codex/config.toml` registriert einen `SessionStart`-Hook und
einen asynchronen `PostToolUse`-Hook. Codex startet nach einem erfolgreichen
Push des aktuellen Branches zu `origin` einen separaten Reviewer, sofern ein
offener GitHub-PR für den Branch existiert. Der Implementer ruft keinen
Review-Hook selbst auf. Der fachliche Reviewer-Auftrag steht in
**`.codex/reviewer.md`** und kann frei bearbeitet werden.

## Voraussetzungen und Aktivierung

- Codex CLI mit `hooks`, asynchronen Hooks und `codex queue`, Python 3 und `gh`.
- Funktionierende Codex-Anmeldung und `gh auth status`.
- Misi als vertrauenswürdiges Projekt öffnen und die beiden projektspezifischen
  Hooks in Codex freigeben, falls Codex dies verlangt. Hook-Vertrauen wird nicht
  durch das Repository selbst erteilt oder umgangen.
- Nach Änderung der Konfiguration eine neue Codex-Sitzung im Repository starten.
  Die laufende Sitzung wird dadurch nicht nachträglich umkonfiguriert.

Die Git-Remote-Tracking-Refs werden beim Sitzungsstart aufgenommen. Nach jedem
Tool-Aufruf prüft der Hook auf Änderungen am `origin`-Ref des aktuellen Branches.
So funktionieren auch Push-Wrapper und Shell-Aufrufe, die zunächst nur eine
laufende Prozess-ID zurückgeben. Ein unveränderter Ref startet kein Review.
Ein Fetch eines anderswo gepushten aktuellen Branches kann ebenfalls ein
Review auslösen. Pushes außerhalb einer laufenden Codex-Sitzung lösen selbst
keinen Hook aus. Bei einem neuen PR muss dieser beim Push bereits offen sein.

## Schleifen und Feedback

Ein unabhängiger Push startet eine neue Schleife mit höchstens drei
Reviewer-Aufrufen. Review-Korrekturen werden **nach dem Commit und vor dem
Push** mit der vom Hook gemeldeten Schleife verknüpft:

```sh
python3 scripts/review-hook.py continue <cycle-id>
git push
```

Der Hook startet automatisch die nächste Runde. Nach Runde drei können noch
Korrekturen mit derselben Markierung gepusht werden; eine vierte Runde startet
nicht. Neue Änderungen aufgrund weiterer Benutzer-Anmerkungen erhalten keine
Fortsetzungsmarkierung und starten wieder bei Runde eins. Die Unterscheidung
zwischen Review-Korrektur und neuer Benutzeranforderung trifft der Implementer;
Git kann diesen fachlichen Unterschied nicht selbst erkennen.

Der Reviewer arbeitet in einem separaten, temporären Checkout des tatsächlich
gepushten Commits im Read-only-Sandboxmodus. Er erhält den gesamten PR-Diff zur
Merge-Base des aktuellen Zielbranches sowie frühere Berichte seiner Schleife.
Lokale, nicht versionierte Umgebungsdateien werden nicht kopiert.

Feedback wird mit `codex queue` an die auslösende Implementer-Sitzung geschickt.
Wenn die lokale Session-Queue nicht erreichbar ist, liefert der asynchrone Hook
das Feedback als `additionalContext` an Codex zurück. Der Implementer bewertet
die Findings selbst und erklärt, was er übernimmt oder verwirft. Ein neuerer
Push kann den Bericht überholen: Vor Korrekturen immer den Commit-Bezug prüfen.

Zähler, Gründe, Logs und Berichte liegen unter `misi-review/` im gemeinsamen
Git-Verzeichnis (`git rev-parse --git-common-dir`). Sie bleiben bei einem
Sitzungsneustart erhalten und werden nicht eingecheckt. Die Begrenzung und
Deduplizierung gelten für diesen lokalen Clone einschließlich seiner Worktrees,
nicht über verschiedene Rechner hinweg. Fehlgeschlagene Reviewer-Aufrufe zählen
als Versuch; Fehler werden ausdrücklich als fehlgeschlagen zurückgemeldet.

## Begründete Ausnahme

Nur bei einem konkreten Ausnahmegrund nach dem Commit und vor dem Push:

```sh
python3 scripts/review-hook.py skip --reason "Konkreter Ausnahmegrund mit nachvollziehbaren Details"
git push
```

Die Ausnahme gilt ausschließlich für den aktuellen Commit. Ohne Begründung
oder mit weniger als 20 Zeichen wird sie abgelehnt. Der Grund wird dauerhaft
im lokalen Review-Protokoll gespeichert und an den Implementer zurückgemeldet.
Eine Mindestlänge prüft keine inhaltliche Triftigkeit: Der Implementer muss den
Grund erklären; reine Zeitersparnis ist kein Ausnahmegrund.

## Prüfung

```sh
python3 -m unittest discover -s scripts -p 'test_review_hook.py' -v
```

Die Tests verwenden echte temporäre Git-Repositories und lokale Pushes;
GitHub, Reviewer und Feedback-Zustellung werden dabei ersetzt.
