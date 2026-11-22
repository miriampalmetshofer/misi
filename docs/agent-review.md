# Lokales Review vor dem Push

Der Implementer beauftragt einen nativen Codex-Subagenten mit dem Review.
Der Subagent liest den festgeschriebenen Git-Stand und liefert seine Findings
an die Implementer-Sitzung zurück. Der Ablauf braucht keinen offenen Pull
Request und schreibt keine GitHub-Kommentare.

## Einrichtung

Einmal pro Clone, auch in einer neuen Cloud-Umgebung:

```sh
python3 scripts/review-hook.py install
```

Der Hook, sein Prüfer und die Berichte liegen im gemeinsamen Git-Verzeichnis
und gelten auch für verknüpfte Worktrees. Bei einem vorhandenen `pre-push`-Hook
oder gesetztem `core.hooksPath` kopierst du `scripts/review-hook.py` als
`misi-review-check.py` neben deinen Hook und bindest den Aufruf aus
`.githooks/pre-push` dort ein. Wiederhole die Installation, wenn sich der
Prüfer ändert.

## Review in Codex

1. Committe die Änderungen und aktualisiere bei Bedarf den lokalen Zielbranch mit
   `git fetch origin`. Rufe `python3 scripts/review-hook.py prepare` auf. Standard
   ist der aktuelle Commit gegen `origin/main`. Mit `--base origin/anderer-branch`
   und `--commit <sha>` kannst du beide Stände auswählen.
2. Gib den ausgegebenen Auftrag an einen nativen Codex-Subagenten weiter und warte
   auf dessen Findings. Bei einem abgebrochenen Lauf speicherst du keinen Bericht.
3. Bewerte die Findings und speichere den Bericht mit den beiden exakten SHAs aus
   Schritt 1, etwa bei einem Review ohne Findings:

   ```sh
   python3 scripts/review-hook.py record \
     --commit <commit-sha> --base-commit <target-sha> \
     --feedback "Keine Findings." --summary "Keine offenen Punkte."
   ```

4. Pushe den geprüften Commit und öffne den PR für das menschliche Review. Nach
   Korrekturen braucht der neue Commit sein eigenes Review samt Bewertung.

Der JSON-Bericht unter `misi-pre-push-review/` im gemeinsamen Git-Verzeichnis
enthält den geprüften Commit, den Zielstand, die Merge-Base, die Findings und
ihre Bewertung. Der Hook verlangt für jede aktualisierte Branch-Spitze einen
passenden Bericht. Branch-Löschungen und Tags sind ausgenommen. Der Hook arbeitet
lokal und vertraut darauf, dass der Implementer die Findings korrekt erfasst.
