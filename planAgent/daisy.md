## Plan: DaisyUI Full App Migration

Empfohlener Ansatz: DaisyUI als neue Tailwind-basierte Primitive einführen, aber die bestehende Markenoptik über eigene Theme-Tokens und kleine Wrapper-Komponenten erhalten. Keine direkte 1:1-Ersetzung per Suchen/Ersetzen; stattdessen zuerst gemeinsame UI-Bausteine und Layout-Hüllen migrieren, dann die Auth- und Planner-Module schrittweise auf diese Bausteine umstellen.

**Steps**
1. Phase 1: DaisyUI-Grundlage einführen. DaisyUI installieren, die Tailwind-v4-kompatible Plugin-/Theme-Einbindung festlegen und das bestehende Farbsystem aus `src/styles.css` als DaisyUI-Theme abbilden. Ziel: DaisyUI-Komponenten sollen visuell nah an der aktuellen App bleiben, statt den Standard-Look zu übernehmen.
2. Phase 1: Migrationsgrenzen festziehen. Alle globalen UI-Klassen mit hoher Wiederverwendung inventarisieren und auf Ziel-Primitiven abbilden: `auth-submit`, `secondary-action`, `danger-action`, `panel`, `chip`, `dialog-surface`, `module-layout`, `note-card`, `account-card`, `app-switch`. Ergebnis ist eine Mapping-Tabelle alt -> neue DaisyUI-/Wrapper-Komponente. *parallel mit Schritt 1*
3. Phase 2: Gemeinsame Wrapper-Komponenten anlegen. Neue zentrale UI-Bausteine einführen, z. B. `AppButton`, `AppCard`, `AppBadge`, `AppInput`, `AppTextarea`, `AppSelect`, `AppCheckbox`, `AppToggle`, `AppDialogShell`. Diese kapseln DaisyUI-Klassen plus bestehende Markentokens. `src/components/planner/ModalDialog.tsx` bleibt als bevorzugte Dialog-Hülle erhalten und wird intern auf DaisyUI-kompatible Struktur/Klassen umgestellt. *hängt von 1-2 ab*
4. Phase 2: Form- und Feedback-Basis migrieren. Zuerst die häufigsten und risikoärmsten Oberflächen ersetzen: Buttons, Inputs, Selects, Textareas, Badges, Checkboxen, Toggles und allgemeine Panel-/Card-Container. Danach gezielt globale CSS-Regeln in `src/styles.css` abbauen oder auf echte globale Basics begrenzen. *hängt von 3 ab*
5. Phase 3: Shell und Navigation migrieren. `PlannerShell`, `PlannerSidebar`, `PlannerTopbar`, `PlannerOverview`, `AccountCard`, `MemberSwitcher` auf die neuen Wrapper-Komponenten umstellen. Ziel: einheitliche Grundoberfläche für alle Module und weniger Styling-Duplikate. *hängt von 4 ab*
6. Phase 3: Auth-Oberfläche migrieren. `AuthScreens` und verwandte Auth-Feedback-/Action-Bereiche auf DaisyUI-basierte Form- und Card-Primitiven umstellen, dabei die vorhandene Typografie und die warme Farbwelt beibehalten. *parallel mit Schritt 5 möglich, wenn Wrapper fertig sind*
7. Phase 4: Planner-Module modulweise migrieren. Reihenfolge nach Wiederverwendung und Komplexität: `NotesModule`, `MealsModule`, `CalendarModule`, `ShoppingModule`, `TasksModule`, `DocumentsModule`, `FamilyModule`. Jede Migration ersetzt zuerst Buttons/Formfelder/Cards, danach komplexere Interaktionen wie Menüs, Status-Chips, Checklisten, Kanban-Spalten, Upload-Flächen und Directory-Ansichten. *hängt von 5 und 6 ab; einzelne Module teilweise parallelisierbar*
8. Phase 4: Dialoge und modale Oberflächen vereinheitlichen. `NoteDialog`, `DocumentEditModal`, `DocumentPreviewModal`, `ConfirmationDialog` und task-/shopping-bezogene Modals auf dieselbe DaisyUI-basierte Dialogsprache bringen, ohne die bestehende `ModalDialog.tsx`-Wiederverwendung aufzugeben. *hängt von 3 ab; parallel mit 7 möglich*
9. Phase 5: Styles aufräumen. Nicht mehr benötigte globale CSS-Blöcke in `src/styles.css` entfernen, nur echte globale Regeln/Tokens behalten und verbliebene Sonderfälle dokumentieren. Besonders prüfen: Checkbox-/Toggle-Styling, Dialog-Oberflächen, Upload-Flächen, Sidebar-Shell, responsive Grid-Hüllen. *hängt von 5-8 ab*
10. Phase 5: Tests systematisch anpassen. Unit- und E2E-Tests auf semantische Rollen/Labels statt auf alte Klassennamen oder konkrete Wrapper-Strukturen ausrichten. Vor allem betroffen: Button-/Dialog-/Checkbox-Erwartungen sowie Layout-Regressionstests, die aktuell auf Klassen wie `panel`, `auth-submit`, `secondary-action`, `app-switch` prüfen. *laufend pro Phase, finaler Durchgang nach 9*

**Relevant files**
- `/home/kubi/Documents/FamilyPlanner/package.json` — DaisyUI-Abhängigkeit ergänzen und sicherstellen, dass die Build-/Test-Toolchain unverändert bleibt.
- `/home/kubi/Documents/FamilyPlanner/vite.config.ts` — prüfen, ob für die gewählte DaisyUI-Integration zusätzliche Styling-/Plugin-Anpassungen nötig sind.
- `/home/kubi/Documents/FamilyPlanner/src/styles.css` — aktueller globaler Styling-Hotspot mit Theme-Tokens und wiederverwendeten Klassen; soll nach der Migration deutlich schrumpfen.
- `/home/kubi/Documents/FamilyPlanner/src/components/auth/AuthScreens.tsx` — komplette Auth-Form-, Card- und Action-Migration.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/ModalDialog.tsx` — zentrale Dialog-Hülle, die intern auf DaisyUI-basierte Struktur umgestellt werden sollte.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/ConfirmationDialog.tsx` — muss mit der neuen Dialog-Hülle konsistent bleiben.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/PlannerShell.tsx` — zentrale Komposition aller Planner-Module und Dialoge; guter Kontrollpunkt für konsistente Wrapper-Nutzung.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/PlannerSidebar.tsx` — Navigation, Account-Zustand, Tab-Auswahl; hoher visueller Hebel.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/PlannerTopbar.tsx` — mobile Navigation und Shell-Konsistenz.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/PlannerOverview.tsx` — kompakter Prüfstein für Cards/Badges/Listen im neuen System.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/TasksModule.tsx` — komplexestes Modul mit Kanban, Menüs, Dialogen und Statuschips.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/ShoppingModule.tsx` — Listen, Checkboxen, Dialoge und Card-Layout.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/DocumentsModule.tsx` — Upload-Flows, Filter, Action-Grid; likely custom beyond stock DaisyUI.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/FamilyModule.tsx` — größter Admin-/Directory-Surface mit vielen Panels, Chips und Gefahr von Layout-Regressions.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/NotesModule.tsx` — einfacher Startpunkt für die erste Modulmigration.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/MealsModule.tsx` — einfacher Startpunkt für Formular/Card-Primitiven.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/CalendarModule.tsx` — mittelkomplexe Form-/Grid-/Panel-Migration.
- `/home/kubi/Documents/FamilyPlanner/src/components/planner/AccountCard.tsx` — wiederverwendete Account-/Action-Karte.
- `/home/kubi/Documents/FamilyPlanner/src/App.test.tsx` — breite App-Regressionen nach UI-Umbau.
- `/home/kubi/Documents/FamilyPlanner/src/App.auth.test.tsx` — Auth-Regressionen nach Form-/Dialog-Migration.
- `/home/kubi/Documents/FamilyPlanner/e2e/app.spec.ts` — E2E-Abdeckung für modale Flows, Auth, Shopping, Tasks und responsive Oberflächen.

**Verification**
1. Nach Phase 1: Build-/Type-/Smoke-Check, dass DaisyUI eingebunden ist und das Theme die Hauptfarben/Typografie korrekt liefert.
2. Nach Einführung der Wrapper-Komponenten: gezielte Unit-Tests für Dialoge, Buttons, Checkboxen/Toggles und zentrale Planner-Shell-Komponenten.
3. Nach jeder Modulmigration: die direkt betroffenen Unit-Tests selektiv laufen lassen, dann die betreffenden E2E-Flows für das Modul prüfen.
4. Nach der kompletten Umstellung: `npm run test:unit`.
5. Danach: `npm run test:e2e`.
6. Zusätzlich manuell prüfen: Mobile Navigation, Dialog-Scrollverhalten, Kartenabstände, Checkbox-/Toggle-Darstellung, Upload-Flächen, Kanban auf kleinen Breiten, Auth-Screens auf Mobile/Desktop.

**Decisions**
- Gewählt: DaisyUI statt Spartan UI.
- Gewählt: komplette App-Migration statt Teilmigration.
- Gewählt: bestehende Markenoptik weitgehend beibehalten; DaisyUI dient als technisches Fundament, nicht als visuelle Standardvorgabe.
- Dialog-Constraint: bestehende Wiederverwendung von `src/components/planner/ModalDialog.tsx` bleibt erhalten; keine unkontrollierte Verteilung library-spezifischer Dialoglösungen.
- Empfohlene Umsetzung: hybride Migration über Wrapper-Komponenten. Direkte Nutzung von DaisyUI-Klassen in allen Fachkomponenten würde die App zwar schneller umstellen, aber die Designkonsistenz und Wartbarkeit verschlechtern.
- Ausdrücklich nicht Teil des Plans: Backend-/Supabase-Änderungen. Das ist ein reiner Frontend-/Styling-/Test-Umbau.

**Further Considerations**
1. Größtes Risiko: `src/styles.css` bündelt heute Theme, Utilities und konkrete Komponentenstile an einem Ort. Ohne Wrapper-Schicht würde die Migration gleichzeitig Designsystem-Wechsel und komplette CSS-Entflechtung erzwingen.
2. Größtes Testthema: Einige Tests prüfen aktuelle Klassennamen direkt. Diese Assertions sollten auf Rollen, Labels und Verhalten umgebaut werden, sonst wird der UI-Umbau unnötig fragil.
3. Empfehlung zur Ausführung: erst Wrapper + Shell + ein einfaches Modul (`NotesModule` oder `MealsModule`) als Referenz fertigstellen, danach den Rest der App nach demselben Muster migrieren.