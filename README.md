# Movie Playlist Tracker

O aplicație web unde îți poți organiza filmele și serialele într-o bibliotecă personală. Poți adăuga titluri, le poți sorta pe categorii, da rating-uri și urmări progresul vizionării — totul direct din browser.

## Categorii

- Urmăresc  
- Planificat  
- Re-vizionare  
- Întrerupt  
- Finisat  
- Abandonat  
- Favorite  

## Funcționalități

- Adăugare filme și seriale (titlu, tip, categorie, rating, progres, notițe)
- Liste personalizate create de utilizator  
- Căutare în watchlist  
- Recomandări de titluri populare  
- Rating cu stele și progres pentru episoade  
- Temă light/dark  
- Notificări pentru acțiuni (add, edit, delete, undo)  
- Export și import în format JSON  

## Stocare date

Datele sunt salvate local în browser (localStorage). Nu există backend și nu este nevoie de cont. Datele rămân salvate până când este ștearsă memoria browserului.

## API

Aplicația folosește API-ul de la The Movie Database (TMDB) pentru:
- căutare filme și seriale  
- preluare detalii (poster, descriere, an, etc.)  
- afișare titluri trending  

## Cum se deschide

Deschide `index.html` în browser sau accesează varianta de pe GitHub Pages. Nu este nevoie de instalare.

## Structură fișiere

- `index.html` — structura aplicației  
- `style.css` — design și layout  
- `dark.css` — tema dark  
- `app.js` — logica principală  
- `lists.js` — liste personalizate  

## Construit de

- Borcea Bogdan  
- Trofaila Alexandru  