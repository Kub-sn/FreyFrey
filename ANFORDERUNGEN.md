# Anforderungen

- [ ] bei dokumente erfassen: 
  - [ ] die inputs komplett löschen
  - [ ] status, dokument kategorie linkzumdoku komplett aus db löschen
  - [ ] bei bearbeiten nur name, alles andere entfernen
  - [ ] bei filter status auch entfernen
  - [ ] status a-z im filter auch entfernen als auswahlmöglichkeit
  - [ ] optional bei datei hochladen entfernen
  - [ ] 1 dokumente zu 1 dokument machen

- [ ] weitere rolle: familien admin, da bei neuanmeldung und neue familie der user die rolle admin bekommt.

- [ ] google calendar einbinden
  - [ ] Google Cloud Projekt: Du musst ein Projekt in der Google Cloud Console erstellen und die API dort aktivieren.
  - [ ] API-Integration: Wenn deine App Termine erstellen, bearbeiten oder löschen soll, nutzt du die Google Calendar API. Hierfür benötigst du OAuth 2.0 für die Nutzer-Anmeldung.

- [ ] essenplan:
  - [ ] Kalender einbauen mit sichtbarkeit von zwei wochen
  - [ ] bonus: auswahl zwischen monat, woche, zwei wochen,
  - [ ] gericht eintragen über den kalender
    - [ ] dialog mit feldern, gerichtname und rezept
    - [ ] man kann soviele gerichte eintragen pro tag wie man möchte

- [ ] notizen:
  - [ ] nichts soll required sein
  - [ ] wenn keine notizen vorhanden, dann soll in dem bereich wo diese wären stehen: keine Notizen vorhanden
  - [ ] fehlermeldung soll angezeigt werden wenn ich gar nichts reinschreibe
  - [ ] in das textfield buttons hinzufügen für bolt, kursiv, checkliste, aufzählungen, textfarben, hintergrundfarbe(optional)
  
- [ ] todo
  - [ ] kanban clone mit todo, in arbeit, erledigt
  - [ ] pro task
    - [ ]  fälligkeitsdatum (wenn dieser bald ist, dann farbe orange, wenn erreicht oder überschritten farbe rot)
    - [ ]  subtasks

- [ ] einkauf
  - [ ] liste erstellen, datum sollte dabei stehen
  - [ ] pro item buttons für löschen und bearbeiten UND einkaufsliste show oder sowas wo dann alles mit checkboxen gelistet ist
  - [ ] dann pro item dialog
  - [ ] darin kann ich mehrere artikel hintereinander hinzufügen




Melde dich mit dem einzigen Admin-Konto an und öffne Familie & Rollen. Im Formular Familienmitglied einladen muss ein zusätzliches Feld Familie sichtbar sein. Mit einem normalen Familiengründer oder familyuser darf dieses Feld nicht sichtbar sein.

Wähle im Feld Familie bewusst eine andere Familie als die aktuell geöffnete. Trage eine frische Test-Mailadresse ein und sende eine Einladung als familyuser. Erwartung: Erfolgsmeldung erscheint, kein Fehler, und die Mail kommt an.

Registriere dich mit genau dieser eingeladenen Mailadresse in einem frischen Browserfenster oder Inkognito-Fenster. Erwartung: Die Registrierung klappt auch dann, wenn offene Registrierung deaktiviert ist, weil die Einladung existiert.

Melde dich mit dem neuen Konto an. Erwartung: Das Konto landet in der Familie, die du im Admin-Formular ausgewählt hast, nicht in der Familie, aus der du die Einladung abgeschickt hast.

Prüfe den Negativfall. Schalte als Admin die offene Registrierung aus und versuche danach eine Registrierung mit einer nicht eingeladenen Mailadresse. Erwartung: Oben auf der Registrierungsseite erscheint der Hinweis, und beim Absenden kommt die Fehlermeldung, dass der Admin die Registrierung deaktiviert hat.

Wenn etwas davon fehlschlägt, ist die Zuordnung meist sofort eingrenzbar:

Familienauswahl fehlt: Frontend ist nicht aktuell.
Einladung speichert nicht: SQL/Migration nicht live.
Mail kommt nicht: send-family-invite oder Mail-Secrets nicht korrekt live.
Registrierung trotz Sperre möglich: Registrierungsgate nicht live.
Nutzer landet in falscher Familie: Invite-Annahme oder Ziel-Familien-ID stimmt nicht.