# CM Event Leads — telepítési útmutató (magyarul)

Ez a rövidített, lépésről lépésre útmutató. A teljes dokumentáció angolul a
[`README.md`](README.md) fájlban van.

**Amire szükséged van:** egy számítógép **Node.js 18+** telepítve
(<https://nodejs.org> → "LTS"), egy **GitHub** fiók és egy **Supabase** fiók.
Mindkettő ingyenes.

---

## 1–2. Supabase fiók és projekt

1. <https://supabase.com> → **Start your project** → belépés GitHub-bal.
2. **New project**:
   * **Name:** `cm-event-leads`
   * **Database Password:** erős jelszó — **mentsd el jelszókezelőbe!**
   * **Region:** `Central EU (Frankfurt)`
   * **Plan:** Free
   * **Create new project** → várj ~2 percet.

## 3–5. Adatbázis, biztonság, aláírás-tárhely

A Supabase felületén: **SQL Editor** → **New query** → bemásolod a fájl **teljes**
tartalmát → **Run**. Ezt négyszer, **ebben a sorrendben**:

| # | Fájl | Mit csinál |
|---|---|---|
| 1 | `supabase/01_schema.sql` | táblák, indexek, nézetek |
| 2 | `supabase/02_rls.sql` | jogosultságok (Row Level Security) |
| 3 | `supabase/03_functions.sql` | regisztrációs és statisztika funkciók |
| 4 | `supabase/04_storage.sql` | privát `signatures` bucket az aláírásoknak |

Mindegyik után `Success` kell megjelenjen.

Ellenőrzés: **Table Editor** → látszanak a táblák, mindegyiken zöld
**RLS enabled** címke. **Storage** → van egy **signatures** bucket, ami *privát*.

## 6. Supabase Auth beállítása

* **Authentication → Providers → Email**: legyen bekapcsolva.
* **"Enable email signups" / "Allow new users to sign up": KAPCSOLD KI.**
  Fontos — csak te hozhass létre fiókot.

## 7. Első adminisztrátor

1. **Authentication → Users → Add user → Create new user**
   * E-mail: pl. `lucian@color-metal.ro`
   * Erős jelszó
   * **Auto Confirm User** legyen bepipálva
2. **SQL Editor** → `supabase/05_first_admin.sql` bemásolása,
   **a 17. sorban átírod az e-mailt és a nevet**, majd **Run**.

> Az Auth felhasználó önmagában **nem elég** — az `admin_profiles` sor adja a
> hozzáférést. További admin: ismételd meg a 7. lépést másik e-maillel.

*(Opcionális)* `supabase/06_seed_optional.sql` — feltölt néhány értékesítőt.

## 8. Környezeti változók

Supabase: **Project Settings (fogaskerék) → API**. Két érték kell:

* **Project URL** → `https://xxxx.supabase.co`
* **Project API keys → `anon` `public`** → hosszú `eyJhbGciOi…` szöveg

A projekt mappájában:

```bash
cp .env.example .env
```

Majd a `.env` fájlba:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.....
VITE_BASE_PATH=
```

> ⚠️ A `service_role` kulcsot **SOHA** ne másold ide és ne töltsd fel sehova.
> Az `anon` kulcs viszont nyilvános, azt szabad.

## 9. Futtatás helyben

```bash
cd cm-event-leads
npm install
npm run dev
```

* <http://localhost:5173/#/> → látogatói regisztráció
* <http://localhost:5173/#/admin> → admin belépés (a 7. lépésben létrehozott fiók)

Leállítás: `Ctrl+C`.

## 10–11. GitHub repó és feltöltés

1. <https://github.com/new> → név: `cm-event-leads` → **Private** →
   ne pipáld be a "Add a README file"-t → **Create repository**.
2. A projekt mappájában:

```bash
git init
git add .
git commit -m "CM Event Leads - kezdeti verzio"
git branch -M main
git remote add origin https://github.com/<FELHASZNALONEVED>/cm-event-leads.git
git push -u origin main
```

> A `.env` a `.gitignore`-ban van, tehát a kulcsaid **nem** kerülnek fel. Ez így jó.

## 12–13. Publikálás GitHub Pages-re

1. Repó → **Settings → Secrets and variables → Actions → Variables fül →
   New repository variable**. Két változó:

| Név | Érték |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi…` |

> Figyelem: a **Variables** fülre, nem a Secrets-re!

2. Repó → **Settings → Pages → Build and deployment → Source: GitHub Actions**
3. **Actions** fül → ha nem indult el magától: **Deploy to GitHub Pages** →
   **Run workflow** → várd meg a zöld pipát (1–2 perc).
4. Az oldal elérhető:

```
https://<FELHASZNALONEVED>.github.io/cm-event-leads/
```

Ezután **minden `git push` automatikusan újrapublikál**:

```bash
git add .
git commit -m "modositas"
git push
```

## 14–17. Első esemény

* **Admin:** `https://<FELHASZNALONEVED>.github.io/cm-event-leads/#/admin`
* **Evenimente → + Eveniment nou** → név, helyszín, dátumok → **Salvează**
* Automatikusan megnyílik az **űrlapszerkesztő**:
  * **ACTIV** kapcsoló: melyik kérdés jelenjen meg
  * **OBLIGATORIU** kapcsoló: kötelező-e — kérdésenként külön
  * **MODIFICĂ**: címke, placeholder, súgó, opciók, szekció
  * **↑ ↓** vagy a **⡿** fogantyú húzása: sorrend
  * **+ Adaugă întrebare proprie**: teljesen új saját kérdés
  * **Aplică un șablon**: kész sablonból indulás
  * Jobb oldalon: **Semnătură** (kikapcsolva / opcionális / kötelező) és
    **GDPR** (mód + pontos szöveg + verzió)
  * **Previzualizează formularul**: pontosan azt látod, amit a látogató
* Minden mentés azonnal történik — nincs külön "mentés" gomb.
* **Evenimente** listában: **Setează ca activ** — ez jelenik meg a tableten.

## 18. Tabletes teszt

1. A tableten nyisd meg: `https://<FELHASZNALONEVED>.github.io/cm-event-leads/`
2. Tedd ki a kezdőképernyőre (teljes képernyős kioszk mód):
   * **iPad / Safari:** Megosztás → *Hozzáadás a főképernyőhöz*
   * **Android / Chrome:** ⋮ → *Hozzáadás a kezdőképernyőhöz*
3. Töltsd ki, írd alá **ujjal vagy tollal**, küldd be.
4. **Admin → Contacte**: ott a lead, `CM-2026-000001` formátumú azonosítóval.

QR-kód: **Admin → Evenimente → esemény megnyitása** — kinyomtatható, a látogatók
saját telefonról is regisztrálhatnak.

## 19. Offline teszt

1. Kapcsold ki a tableten a Wi-Fi-t.
2. Töltsd újra az oldalt — továbbra is működik (az űrlap gyorsítótárazva van).
3. Küldj be egy regisztrációt → narancs sáv:
   *"Înregistrare salvată local – sincronizare în așteptare"*.
4. Kapcsold vissza a Wi-Fi-t → ~20 másodpercen belül automatikusan feltöltődik.
5. **Admin → Contacte**: a lead pontosan **egyszer** szerepel.

> A regisztráció azonosítója a tableten készül és ez az adatbázis elsődleges
> kulcsa — ezért az újrapróbálkozás soha nem hoz létre duplikátumot.

## 20. Export Excelbe

**Admin → Contacte**

* **Exportă tot · XLSX** — minden
* **Exportă evenimentul curent** — csak az adott esemény
* **Exportă rezultatele filtrate · XLSX** — pontosan amit a szűrők mutatnak
* **CSV** — UTF-8 BOM-mal, hogy az Excel jól mutassa az `ă â î ș ț ő ű` betűket

A saját kérdések **automatikusan külön oszlopok lesznek**, pontosan azzal a
kérdésszöveggel, amit a látogató látott.

---

## Arculat

Minden szín, betűtípus és logó **egyetlen fájlban** van:

```
src/config/brand.js
```

Már a hivatalos Color Metal brandbook értékeivel: arany `#C0A062`,
ezüst `#939598`, narancs `#F4B422`, grafit `#323232`, Montserrat betűtípus.
A logók a `public/` mappában (`cm-logo.png`, `cm-logo-white.png`) — ha lecseréled
ezt a két fájlt, az egész alkalmazásban lecserélődik.

Az **Admin → Setări** oldalon a cégnév, a logók és a fő színek futásidőben is
felülírhatók, újrapublikálás nélkül.

---

## Napi használat eseményen

**Esemény előtt:** esemény létrehozása (vagy a tavalyi **Duplică** — a teljes
űrlapbeállítás átjön), űrlap beállítása, **Setează ca activ**, QR kinyomtatása,
tableten egyszer megnyitni **online**, majd kitenni a főképernyőre.

**Esemény alatt:** a tablet a regisztrációs képernyőn marad, minden látogató után
~5 másodperccel magától alaphelyzetbe áll. Figyeld a kapcsolat-jelzőt: ha
`Pending sync: n`, a leadek helyben biztonságban vannak.

**Esemény után:** minden használt tableten legyen `Pending sync: 0`, majd
**Exportă evenimentul curent**, státuszok és felelősök beállítása, végül az
esemény archiválása (a leadek örökre megmaradnak).

---

## Ha valami nem megy

| Tünet | Megoldás |
|---|---|
| „Aplicația nu este configurată" | Hiányzik a `.env` (helyben) vagy a GitHub **Variables** (élesben). A Variables fülre kell, nem a Secrets-re, és utána újra kell futtatni a workflow-t. |
| „Niciun eveniment activ" | Nincs aktív esemény → Evenimente → **Setează ca activ** |
| „Contul există, dar nu are drept de administrator" | Hiányzik az `admin_profiles` sor → futtasd az `05_first_admin.sql`-t azzal az e-maillel |
| Üres oldal a publikálás után | Base path — futtasd újra a workflow-t; a konzolban 404-ek látszanak az `/assets/…`-ra |
| Excelben `Ã¢` látszik `â` helyett | Használd az `.xlsx` exportot, vagy Excelben *Adatok → Szövegből/CSV-ből* és UTF-8 |
| `Pending sync` nem csökken | Admin → Setări → **Forțează sincronizarea**; ha a „try" szám nő, az adott eszköz nem éri el a Supabase-t (tipikus ok: vásári captive-portal Wi-Fi) |

---

*CM Event Leads · Color Metal SRL · Partner in Engineering*
