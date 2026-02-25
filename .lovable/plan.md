

## Plan: Fix Build Errors + Improve LeakedZone Video Extraction

### Probleem

Er zijn twee problemen:

1. **Build errors** - 4 TypeScript fouten verhinderen dat de edge functions deployen
2. **LeakedZone blokkeert** - De site blokkeert de headless browser van Firecrawl, waardoor de video agent "No video streams found" teruggeeft. De videos worden wel gevonden door de media scanner, maar downloaden/afspelen faalt.

---

### Oplossing

#### Stap 1: Fix de 4 build errors

**`video-download-agent/index.ts`** (3 fouten):
- Lijn 98: Voeg type annotatie toe aan `.map()` callback: `(u: string) =>` 
- Lijn 100: Cast return type expliciet naar `string[]`
- Lijn 280: Wrap `Uint8Array` in `new Response(result.data.buffer, ...)` voor Deno compatibiliteit

**`crawl-page/index.ts`** (1 fout):
- Lijn 145: Fix `parseHTML` type door een type assertion toe te voegen: `const doc = parseHTML(html) as any; const document = doc.document;`

#### Stap 2: Verbeter video download fallback

De huidige flow faalt omdat Firecrawl de video-pagina niet goed rendert (LeakedZone blokkeert bots). Verbetering:

- Als de `video-download-agent` faalt, probeer direct de **originele m3u8/stream URL** via de `media-proxy` te laden met verse headers
- Verbeter de fallback-keten in `MediaScanner.tsx`:
  1. Probeer `video-download-agent` (headless browser)
  2. Probeer `media-proxy` met de originele stream URL + referer
  3. Als alles faalt: kopieer de stream URL naar clipboard met duidelijke VLC-instructies

#### Stap 3: Fix clipboard error

De runtime error `Document is not focused` bij `navigator.clipboard.writeText` wordt opgelost door een fallback met `document.execCommand('copy')` toe te voegen.

---

### Technische Details

```text
Bestanden die worden aangepast:
+-- supabase/functions/video-download-agent/index.ts  (3 TS fixes)
+-- supabase/functions/crawl-page/index.ts            (1 TS fix)
+-- src/components/project/MediaScanner.tsx            (betere fallback + clipboard fix)
```

**video-download-agent fixes:**
- `rawMatches.map(u =>` wordt `rawMatches.map((u: string) =>`
- `return unique` wordt `return unique as string[]`  
- `new Response(result.data, ...)` wordt `new Response(result.data.buffer as ArrayBuffer, ...)`

**crawl-page fix:**
- `const { document: doc } = parseHTML(html)` wordt `const { document: doc } = parseHTML(html) as any`

**MediaScanner clipboard fix:**
- Wrapper functie die `navigator.clipboard.writeText()` probeert en bij falen terugvalt op een textarea + `execCommand('copy')`

