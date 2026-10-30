/* ---------- language: the TV's, or the one chosen in the launcher's Settings (as the launcher does in app/src/js/clock.js) ----------
   English is the key itself; TX.da maps English to Danish. A variable part is %s: t('Update to %s').replace('%s', v).
   tools/test/manager.test.js checks that every text given to t() in manager/src/js has a Danish one. */
var TVLANG = ((window.webOSSystem && webOSSystem.locale) || navigator.language || 'en').slice(0, 2);
/* the TV's language, or the one chosen in the launcher's Settings: kept here for the next start, so the first drawing is in it */
function langOf(pref) {
  return pref === 'da' || pref === 'en' ? pref : TVLANG;
}
var LANG = (function () {
  try {
    return langOf(localStorage.getItem('cytv.manager.lang'));
  } catch (e) {
    return TVLANG;
  }
})();
/* the service's choice (manager status "language": auto, da or en); another than the one drawn: the page again, in it */
function followLang(pref) {
  if (langOf(pref) === LANG) return;
  try {
    localStorage.setItem('cytv.manager.lang', pref);
    if (localStorage.getItem('cytv.manager.lang') === pref) location.reload();
  } catch (e) {}
}
var TX = {
  da: {
    // on and off, buttons
    'On': 'Til',
    'Off': 'Fra',
    'Close': 'Luk',
    'Back': 'Tilbage',
    'Cancel': 'Annuller',
    'Start': 'Start',
    'Skip': 'Spring over',
    'Clear': 'Ryd',
    'Continue': 'Fortsæt',
    'Continue to the test': 'Fortsæt til testen',
    'Try again': 'Prøv igen',
    'Learn again': 'Lær igen',
    'selected': 'valgt',
    'default': 'standard',
    'optional': 'valgfri',
    'Saved': 'Gemt',

    // the main list
    'Launcher': 'Startskærm',
    'Service': 'Tjeneste',
    'Check for updates': 'Søg efter opdateringer',
    'Update channel': 'Opdateringskanal',
    'Go back to launcher': 'Gå tilbage til startskærm',
    'Go back to launcher %s': 'Gå tilbage til startskærm %s',
    'Update to': 'Opdater til',
    'Update to %s': 'Opdater til %s',
    'Update to %s (test build)': 'Opdater til %s (testversion)',
    'Checking…': 'Søger…',
    'No release yet': 'Ingen udgivelse endnu',
    'Cannot check': 'Kan ikke søge',
    'Up to date': 'Opdateret',
    'CleanYourTV as Home': 'CleanYourTV som startskærm',
    'Theme': 'Tema',
    'Live TV': 'Live-tv',
    'Input key': 'Input-knappen',
    'not available': 'ikke tilgængelig',
    'Voice': 'Stemme',
    'not installed': 'ikke installeret',
    'Network notifications': 'Notifikationer fra netværket',
    'Debloat LG’s ads and telemetry': 'Fjern LG’s reklamer og sporing',
    'Hide the Magic Remote pointer': 'Skjul Magic Remote-markøren',
    'not possible on this TV': 'ikke muligt på dette tv',
    'Share log': 'Del log',
    'QR code for your phone': 'QR-kode til din telefon',
    'Uninstall': 'Fjern CleanYourTV',
    'Launcher %s · service %s': 'Startskærm %s · tjeneste %s',
    'Updates: %s': 'Opdateringer: %s',
    'Latest release %s': 'Nyeste udgivelse %s',
    'The service did not answer': 'Tjenesten svarede ikke',
    'The service did not answer.': 'Tjenesten svarede ikke.',
    'Waiting for the service…': 'Venter på tjenesten…',
    'Reading status…': 'Læser status…',

    // update channel
    'Where updates come from': 'Hvor opdateringerne kommer fra',
    'Stable releases': 'Stabile udgivelser',
    'the latest published release': 'den nyeste udgivne version',
    'Test: %s': 'Test: %s',
    'build %s': 'version %s',
    'No test builds right now': 'Ingen testversioner lige nu',
    'a test build appears when a branch is pushed': 'en testversion dukker op, når en gren bliver skubbet op',
    'Looking for test builds…': 'Leder efter testversioner…',
    'Switching…': 'Skifter…',
    'Following %s. If the Launcher or Service row offers an update, that is the test build.':
      'Følger %s. Hvis Startskærm eller Tjeneste tilbyder en opdatering, er det testversionen.',
    'Back on the stable releases': 'Tilbage på de stabile udgivelser',

    // Home
    'Switch Home?': 'Skift startskærm?',
    'Remove CleanYourTV?': 'Fjern CleanYourTV?',
    'Yes, remove CleanYourTV': 'Ja, fjern CleanYourTV',
    'Yes, use CleanYourTV as Home': 'Ja, brug CleanYourTV som startskærm',
    'Yes, use LG’s Home': 'Ja, brug LG’s startskærm',
    'settings and apps are deleted; the TV restarts': 'indstillinger og apps slettes; tv’et genstarter',
    'the TV restarts': 'tv’et genstarter',
    'Removing CleanYourTV… the TV restarts in a moment and LG’s Home comes back.':
      'Fjerner CleanYourTV… tv’et genstarter om lidt, og LG’s startskærm kommer tilbage.',
    'Switching to CleanYourTV… the TV restarts in a moment.': 'Skifter til CleanYourTV… tv’et genstarter om lidt.',
    'Switching to LG’s Home… the TV restarts in a moment.': 'Skifter til LG’s startskærm… tv’et genstarter om lidt.',

    // themes
    'Choose how Home looks. The change shows the next time you open Home.':
      'Vælg, hvordan startskærmen ser ud. Ændringen ses, næste gang du åbner startskærmen.',
    'on GitHub': 'på GitHub',
    'By %s': 'Af %s',
    'Downloaded from GitHub when you choose it.': 'Hentes fra GitHub, når du vælger det.',
    'Theme options': 'Temaindstillinger',
    'accent colour': 'accentfarve',
    'Accent colour': 'Accentfarve',
    'Theme default': 'Temaets standard',
    'Go back to the previous theme': 'Gå tilbage til det forrige tema',
    'nothing to go back to': 'intet at gå tilbage til',
    'Previous theme restored': 'Det forrige tema er sat tilbage',
    'Accent: theme default': 'Accent: temaets standard',
    'Accent: %s': 'Accent: %s',
    'The colour of the focus ring and highlights': 'Farven på fokusrammen og fremhævninger',
    'Loading themes…': 'Indlæser temaer…',
    'Could not reach GitHub (%s): showing the themes on this TV.': 'Kunne ikke nå GitHub (%s): viser temaerne på dette tv.',
    'Getting %s…': 'Henter %s…',
    '%s applied. Open Home to see it.': '%s er valgt. Åbn startskærmen for at se det.',
    // accent colours (names from the service)
    'White': 'Hvid',
    'Blue': 'Blå',
    'Teal': 'Blågrøn',
    'Green': 'Grøn',
    'Yellow': 'Gul',
    'Orange': 'Orange',
    'Red': 'Rød',
    'Pink': 'Lyserød',
    'Purple': 'Lilla',

    // Live TV
    'Live TV: your own playlist': 'Live-tv: din egen playliste',
    'Show Live TV': 'Vis Live-tv',
    'Playlist': 'Playliste',
    '%s channels': '%s kanaler',
    'guide for %s programmes': 'programguide med %s udsendelser',
    'not set · set up from your phone': 'ikke sat op · sæt op fra din telefon',
    'Refresh playlist and guide': 'Opdater playliste og programguide',
    'Refreshing…': 'Opdaterer…',
    'Refreshing in the background': 'Opdaterer i baggrunden',
    'Learn the Guide key': 'Lær Guide-knappen',
    'not learned · LG’s guide stays': 'ikke lært · LG’s guide bliver',
    'Live TV is off': 'Live-tv er slået fra',
    'Clear recent channels': 'Ryd seneste kanaler',
    'Recent channels cleared': 'Seneste kanaler er ryddet',
    'Remove the playlist': 'Fjern playlisten',
    'nothing to remove': 'intet at fjerne',
    'Remove the playlist?': 'Fjern playlisten?',
    'Yes, remove the playlist': 'Ja, fjern playlisten',
    'the address, the channel list, the guide and your favourites are deleted':
      'adressen, kanallisten, programguiden og dine favoritter slettes',
    'Playlist removed': 'Playlisten er fjernet',
    'No, keep it': 'Nej, behold den',
    'Set up Live TV': 'Sæt Live-tv op',
    '<li>Phone on the <b>same Wi-Fi</b> as the TV.</li><li>Scan the code with the camera.</li><li>Enter the <b>code</b> below and your playlist address.</li>':
      '<li>Telefonen på <b>samme wi-fi</b> som tv’et.</li><li>Scan koden med kameraet.</li><li>Indtast <b>koden</b> herunder og adressen på din playliste.</li>',
    'code %s': 'kode %s',
    'The page stays open for ten minutes. It is not encrypted: the playlist address, which may hold an access key, travels over your Wi-Fi.':
      'Siden er åben i ti minutter. Den er ikke krypteret: adressen på playlisten, som kan indeholde en adgangsnøgle, sendes over dit wi-fi.',
    'Playlist saved': 'Playlisten er gemt',
    // Live TV states (from the service)
    'loading playlist': 'indlæser playliste',
    'loading guide': 'indlæser programguide',

    // the Input key
    'Input key opens our Inputs list': 'Input-knappen åbner vores liste over indgange',
    'not available on this firmware': 'ikke tilgængelig på denne firmware',
    'Learn the Input key': 'Lær Input-knappen',
    'default (%s)': 'standard (%s)',
    'learned: %s': 'lært: %s',
    'default: %s': 'standard: %s',
    'now: %s': 'nu: %s',
    'not learned': 'ikke lært',
    'Input key shows': 'Input-knappen viser',
    'over the running app, ready in the background (instant)': 'over den åbne app, klar i baggrunden (straks)',
    'over the running app, started when pressed': 'over den åbne app, startes ved tryk',
    'the launcher’s Inputs list': 'startskærmens liste over indgange',
    'LG’s own list: CleanYourTV is not the Home': 'LG’s egen liste: CleanYourTV er ikke startskærmen',
    'Learn the Home key': 'Lær Hjem-knappen',
    'Take over the Input key': 'Overtag Input-knappen',
    // why the picker mode changed (from the service)
    'switched off in the manager': 'slået fra i CleanYourTV',
    'chosen in the manager': 'valgt i CleanYourTV',
    'the TV keeps closing the hidden picker': 'tv’et lukker hele tiden den skjulte liste',

    // learning keys
    'The Input key.\nChoose Start, then press the Input button on your remote.':
      'Input-knappen.\nVælg Start, og tryk så på Input-knappen på din fjernbetjening.',
    'back to the default (%s)': 'tilbage til standard (%s)',
    'The Home key (optional).\nChoose Start, then press the Home button on your remote.':
      'Hjem-knappen (valgfri).\nVælg Start, og tryk så på Hjem-knappen på din fjernbetjening.',
    'forget the code': 'glem koden',
    'The voice button.\nChoose Start, then press the button you want to use for voice. The remote’s microphone button may not reach the hook; any spare button works.':
      'Stemmeknappen.\nVælg Start, og tryk så på den knap, du vil bruge til stemme. Fjernbetjeningens mikrofonknap når måske ikke frem; enhver ledig knap virker.',
    'The Guide key.\nChoose Start, then press the Guide button on your remote. It then opens the Live TV channel guide instead of LG’s guide. Clear it to get LG’s guide back.':
      'Guide-knappen.\nVælg Start, og tryk så på Guide-knappen på din fjernbetjening. Derefter åbner den Live-tv’s programguide i stedet for LG’s. Ryd den for at få LG’s guide tilbage.',
    'LG’s guide again': 'LG’s guide igen',
    'Done.\nInput key %s.\nThe Home key is optional: learn it from the main list so that it also closes Live TV and Films & Series.':
      'Færdig.\nInput-knappen %s.\nHjem-knappen er valgfri: lær den fra hovedlisten, så den også lukker Live-tv og Film og serier.',
    'Input key cleared.\nIt uses the default code (%s).': 'Input-knappen er ryddet.\nDen bruger standardkoden (%s).',
    'Voice button cleared.': 'Stemmeknappen er ryddet.',
    'Guide key cleared. LG’s guide is back.': 'Guide-knappen er ryddet. LG’s guide er tilbage.',
    'Home key cleared.': 'Hjem-knappen er ryddet.',
    'Press the Input button now…': 'Tryk på Input-knappen nu…',
    'Press the voice button now…': 'Tryk på stemmeknappen nu…',
    'Press the Guide button now…': 'Tryk på Guide-knappen nu…',
    'Press the Home button now…': 'Tryk på Hjem-knappen nu…',
    'Input key learned: code %s.': 'Input-knappen er lært: kode %s.',
    'Voice button learned: code %s.': 'Stemmeknappen er lært: kode %s.',
    'Guide key learned: code %s.': 'Guide-knappen er lært: kode %s.',
    'Home key learned: code %s.': 'Hjem-knappen er lært: kode %s.',
    'The hook did not attach on this firmware, so keys cannot be learned. The Input key stays with LG’s picker.\nUse Share log to report this.':
      'Krogen kunne ikke kobles på denne firmware, så knapper kan ikke læres. Input-knappen bliver hos LG’s liste.\nBrug Del log til at melde det.',
    'Nothing was pressed.': 'Der blev ikke trykket på noget.',
    'Test.\nPress the Input button once more. Our Inputs list should open over this screen.':
      'Test.\nTryk på Input-knappen en gang til. Vores liste over indgange skal åbne over denne skærm.',
    'The Inputs list opened: the Input key works.': 'Listen over indgange åbnede: Input-knappen virker.',
    'The Inputs list did not open.\nIf LG’s own picker showed, the Input key is not mapped: learn it again or switch the Input key off.':
      'Listen over indgange åbnede ikke.\nHvis LG’s egen liste kom frem, er Input-knappen ikke koblet: lær den igen, eller slå Input-knappen fra.',

    // voice
    'Install voice': 'Installer stemme',
    'installing…': 'installerer…',
    'downloads about 80 MB': 'henter cirka 80 MB',
    'Listen on the voice button': 'Lyt på stemmeknappen',
    'learn a button first': 'lær en knap først',
    'Learn the voice button': 'Lær stemmeknappen',
    'Try it now': 'Prøv det nu',
    'listening…': 'lytter…',
    'speak when the card appears': 'tal, når kortet vises',
    'Speak now…': 'Tal nu…',
    'Listening…': 'Lytter…',
    'Switch off LG’s voice assistant': 'Slå LG’s stemmeassistent fra',
    'not paused yet': 'ikke sat på pause endnu',
    'Home Assistant (Assist)': 'Home Assistant (Assist)',
    'Which answers first': 'Hvem svarer først',
    'Home Assistant first, then the AI': 'Home Assistant først, så AI’en',
    'Home Assistant only': 'Kun Home Assistant',
    'The AI only': 'Kun AI’en',
    'Assist agent': 'Assist-agent',
    'set up Home Assistant first': 'sæt Home Assistant op først',
    'AI chat (OpenRouter)': 'AI-chat (OpenRouter)',
    'no key set': 'ingen nøgle sat',
    'Model': 'Model',
    'Send the text to': 'Send teksten til',
    'not set · shows a card only': 'ikke sat · viser kun et kort',
    'Set up from your phone': 'Sæt op fra din telefon',
    'key, model, Home Assistant, server': 'nøgle, model, Home Assistant, server',
    'Set up with commands': 'Sæt op med kommandoer',
    'for scripts and ssh': 'til scripts og ssh',
    'Forget the conversation': 'Glem samtalen',
    'Conversation cleared': 'Samtalen er glemt',
    'Remove voice': 'Fjern stemme',
    'deletes the %s MB download': 'sletter de %s MB, der blev hentet',
    'Voice removed': 'Stemme er fjernet',
    'Last heard: “%s”': 'Sidst hørt: “%s”',
    'Not sent: %s': 'Ikke sendt: %s',
    'Last try: %s': 'Sidste forsøg: %s',
    // the last try (from the service)
    'listening': 'lytter',
    'nothing heard': 'intet hørt',
    'nothing recognised': 'intet genkendt',
    'heard': 'hørt',
    'error': 'fejl',
    'Choose the model that answers': 'Vælg den model, der svarer',
    'Choose the Home Assistant agent': 'Vælg Home Assistant-agenten',
    '$%s per million words in': '$%s pr. million ord ind',
    'Default agent': 'Standardagent',
    'Home Assistant’s own': 'Home Assistants egen',
    'Loading the model list…': 'Indlæser listen over modeller…',
    'Auto (OpenRouter picks)': 'Auto (OpenRouter vælger)',
    'Asking Home Assistant…': 'Spørger Home Assistant…',
    'Connected to %s': 'Forbundet til %s',
    'Agent: %s': 'Agent: %s',
    'Model: %s': 'Model: %s',
    'Set the address of your server (from a shell on the TV):': 'Sæt adressen på din server (fra en shell på tv’et):',
    'The TV sends: POST, JSON {"text":"..."}, with "Authorization: Bearer <token>" when a token is set. If your server answers with JSON {"text":"..."} (or plain text), the answer is shown as a card. Only the recognised text is sent, never audio.':
      'Tv’et sender: POST, JSON {"text":"..."}, med "Authorization: Bearer <token>", når en token er sat. Hvis din server svarer med JSON {"text":"..."} (eller ren tekst), vises svaret som et kort. Kun den genkendte tekst sendes, aldrig lyd.',
    'Chat with a language model through OpenRouter. Run these on the TV (ssh):':
      'Chat med en sprogmodel via OpenRouter. Kør disse på tv’et (ssh):',
    'Optional: "system" sets the instructions. Ask by text from anywhere on the TV:':
      'Valgfrit: "system" sætter instruktionerne. Spørg med tekst fra hvor som helst på tv’et:',
    'What is the capital of Peru?': 'Hvad er hovedstaden i Peru?',
    'Spoken and typed questions go to OpenRouter and the model you chose; no audio does. The key stays on the TV.':
      'Talte og skrevne spørgsmål sendes til OpenRouter og den model, du valgte; lyd gør ikke. Nøglen bliver på tv’et.',
    'Home Assistant (Assist), with a long-lived access token:': 'Home Assistant (Assist), med en langtidsgyldig adgangstoken:',
    'Optional: "route" is ha-first, ha-only or ai-only; "selfSigned":true accepts a self-signed certificate; "agent" is a conversation entity.':
      'Valgfrit: "route" er ha-first, ha-only eller ai-only; "selfSigned":true godtager et selvsigneret certifikat; "agent" er en samtaleenhed.',
    '<li>Phone on the <b>same Wi-Fi</b> as the TV.</li><li>Scan the code with the camera.</li><li>Enter your <b>OpenRouter key</b> and model, or your <b>Home Assistant</b> address and access token, and tap <b>Save</b>.</li>':
      '<li>Telefonen på <b>samme wi-fi</b> som tv’et.</li><li>Scan koden med kameraet.</li><li>Indtast din <b>OpenRouter-nøgle</b> og model, eller adressen og adgangstoken til din <b>Home Assistant</b>, og tryk på <b>Save</b>.</li>',
    'The page stays open for ten minutes, or until you save. It is not encrypted: the key travels over your Wi-Fi, so use a network you trust.':
      'Siden er åben i ti minutter, eller indtil du gemmer. Den er ikke krypteret: nøglen sendes over dit wi-fi, så brug et netværk, du stoler på.',
    'The page has closed. Close this and try again.': 'Siden er lukket. Luk dette, og prøv igen.',

    // network notifications
    'Accept notifications from the network': 'Tag imod notifikationer fra netværket',
    'How to send': 'Sådan sender du',
    'address, token, example': 'adresse, token, eksempel',
    'Send a POST request:': 'Send en POST-forespørgsel:',
    'Header:': 'Header:',
    'Body (JSON):': 'Indhold (JSON):',
    'Front door': 'Hoveddør',
    'Someone is at the door': 'Der er nogen ved døren',
    'Show as QR code': 'Vis som QR-kode',
    'scan with a phone to copy the address and token': 'scan med en telefon for at kopiere adresse og token',
    'New token': 'Ny token',
    'the old one stops working': 'den gamle holder op med at virke',
    'New token created. Open “How to send” to see it.': 'Ny token oprettet. Åbn “Sådan sender du” for at se den.',
    'Switch notifications on first': 'Slå notifikationer til først',
    'Notification address and token': 'Adresse og token til notifikationer',
    '<li>Phone on the <b>same Wi-Fi</b> as the TV.</li><li>Scan the code with the camera and open the page: it shows the address and the token with <b>Copy</b> buttons.</li><li>The token is a <b>secret</b>: anyone who sees this code while it is open can read it.</li>':
      '<li>Telefonen på <b>samme wi-fi</b> som tv’et.</li><li>Scan koden med kameraet, og åbn siden: den viser adressen og token med <b>Copy</b>-knapper.</li><li>Token er <b>hemmelig</b>: alle, der ser denne kode, mens den er åben, kan læse den.</li>',
    'Preparing…': 'Gør klar…',
    'The notification listener is not running.': 'Modtageren af notifikationer kører ikke.',
    'The page opens for ten minutes. It is not encrypted: the token travels over your Wi-Fi, so use a network you trust.':
      'Siden er åben i ti minutter. Den er ikke krypteret: token sendes over dit wi-fi, så brug et netværk, du stoler på.',

    // share log
    'Share the log': 'Del loggen',
    '<li>Phone on the <b>same Wi-Fi</b> as the TV.</li><li>Scan the code with the camera.</li><li>Tap <b>Copy</b> on the page and paste it into your message.</li>':
      '<li>Telefonen på <b>samme wi-fi</b> som tv’et.</li><li>Scan koden med kameraet.</li><li>Tryk på <b>Copy</b> på siden, og indsæt den i din besked.</li>',
    'Preparing the report…': 'Gør rapporten klar…',
    'The page is open for ten minutes. It lists versions, the setup log and the service log; addresses and URL paths are masked.':
      'Siden er åben i ti minutter. Den viser versioner, opsætningsloggen og tjenestens log; adresser og URL-stier er skjult.',
    'Could not prepare the report (is the Homebrew Channel installed?).':
      'Kunne ikke gøre rapporten klar (er Homebrew Channel installeret?).',

    // before the setup
    'The service is not running. Set it up to replace LG’s Home, take over the Input key and keep everything up to date.':
      'Tjenesten kører ikke. Sæt den op for at erstatte LG’s startskærm, overtage Input-knappen og holde alt opdateret.',
    'recommended first · installed %s': 'anbefales først · installeret %s',
    'Set up now': 'Sæt op nu',
    'the screen blinks once': 'skærmen blinker én gang',
    'Set up anyway': 'Sæt op alligevel',
    'untested firmware; a failed start restarts the TV': 'utestet firmware; en mislykket start genstarter tv’et',
    'works without the service': 'virker uden tjenesten',
    'Checking for updates…': 'Søger efter opdateringer…',
    'Could not check: %s': 'Kunne ikke søge: %s',
    'no answer': 'intet svar',
    'Version %s is available; this one is %s.': 'Version %s er klar; denne er %s.',
    'Up to date (%s).': 'Opdateret (%s).',
    'Updating to %s…': 'Opdaterer til %s…',
    'Update failed: %s': 'Opdateringen mislykkedes: %s',
    'The update is taking too long. Log: %s on the TV.': 'Opdateringen tager for lang tid. Log: %s på tv’et.',
    'Updating… %s': 'Opdaterer… %s',
    'Setting up… the screen blinks once while LG’s system restarts': 'Sætter op… skærmen blinker én gang, mens LG’s system genstarter',
    'Could not start the setup: %s': 'Kunne ikke starte opsætningen: %s',
    'no answer from the Homebrew Channel service (is it installed and up to date?)':
      'intet svar fra Homebrew Channels tjeneste (er den installeret og opdateret?)',
    'Setup stopped: %s': 'Opsætningen stoppede: %s',
    'The service did not start. Log: %s on the TV.': 'Tjenesten startede ikke. Log: %s på tv’et.',
    'Setting up… %s': 'Sætter op… %s',

    // fixed messages from the service (updates.js, voice.js, selfupdate.js); %s is a version or a number
    'Downloading launcher %s': 'Henter startskærm %s',
    'Checking the download': 'Kontrollerer det hentede',
    'Installing launcher %s': 'Installerer startskærm %s',
    'Checking that the new launcher starts': 'Kontrollerer, at den nye startskærm starter',
    'The new launcher did not start; rolling back': 'Den nye startskærm startede ikke; går tilbage',
    'Launcher %s installed': 'Startskærm %s er installeret',
    'there is no previous version': 'der er ingen tidligere version',
    'Going back to launcher %s': 'Går tilbage til startskærm %s',
    'Launcher %s restored': 'Startskærm %s er sat tilbage',
    'Downloading service %s': 'Henter tjeneste %s',
    'Installing service %s': 'Installerer tjeneste %s',
    'Restarting the service': 'Genstarter tjenesten',
    'Downloading the speech engine (18 MB)': 'Henter talemotoren (18 MB)',
    'Downloading the 64-bit C library (27 MB)': 'Henter 64-bit C-biblioteket (27 MB)',
    'Downloading the speech model (%s of %s)': 'Henter talemodellen (%s af %s)',
    'Testing': 'Tester',
    'Starting': 'Starter',
    'Voice is installed': 'Stemme er installeret',
    'This package has no voice program (cytv-asr); update CleanYourTV first.':
      'Denne pakke har intet stemmeprogram (cytv-asr); opdater CleanYourTV først.',
    'already up to date': 'allerede opdateret',
    'updated to %s. Close CleanYourTV and open it again.': 'opdateret til %s. Luk CleanYourTV, og åbn den igen.',

    // what each row does (help.js)
    'The home screen you see. Updates come from GitHub releases and are checked against a SHA-256 file before they are installed. If a new launcher does not start, the previous one is put back.':
      'Den startskærm, du ser. Opdateringer kommer fra udgivelser på GitHub og kontrolleres mod en SHA-256-fil, før de installeres. Hvis en ny startskærm ikke starter, sættes den forrige tilbage.',
    'The background service behind the launcher: Live TV, picture notifications, the Input key, these updates. A failed update restores the previous files.':
      'Tjenesten i baggrunden bag startskærmen: Live-tv, notifikationer med billeder, Input-knappen og disse opdateringer. En mislykket opdatering sætter de forrige filer tilbage.',
    'Looks for a newer release on GitHub. Nothing is installed until you choose an update.':
      'Leder efter en nyere udgivelse på GitHub. Intet installeres, før du vælger en opdatering.',
    'Stable releases are what most people want. A test build is a change someone asks you to try, built from a branch of the repository; it can be less finished. Choose a test build here, then use the Launcher and Service rows to install it. Going back to Stable offers the latest release again.':
      'Stabile udgivelser er det, de fleste vil have. En testversion er en ændring, nogen beder dig prøve, bygget fra en gren af projektet; den kan være mindre færdig. Vælg en testversion her, og installer den så med rækkerne Startskærm og Tjeneste. Går du tilbage til Stabile, tilbydes den nyeste udgivelse igen.',
    'Swaps the previous launcher version back in. The newer one stays available as an update.':
      'Sætter den forrige version af startskærmen tilbage. Den nyere kan stadig hentes som opdatering.',
    'On: the Home button opens this launcher. Off: LG’s own Home. Switching restarts the TV (about a minute); the service keeps running either way.':
      'Til: Hjem-knappen åbner denne startskærm. Fra: LG’s egen startskærm. Skiftet genstarter tv’et (cirka et minut); tjenesten kører videre i begge tilfælde.',
    'Stops LG’s ad, recommendation and telemetry services and blocks a few ad servers. Nothing is uninstalled, and it only applies while this launcher is Home.':
      'Stopper LG’s tjenester til reklamer, anbefalinger og sporing og blokerer nogle reklameservere. Intet afinstalleres, og det gælder kun, mens denne startskærm er i brug.',
    'The pointer never appears, not on the Home button and not when the remote moves. The buttons work as before; apps that need the pointer, such as the web browser, cannot be used while this is on. Nothing is stored on the TV: switching off brings the pointer back at once.':
      'Markøren vises aldrig, hverken på Hjem-knappen eller når fjernbetjeningen bevæges. Knapperne virker som før; apps, der kræver markøren, som webbrowseren, kan ikke bruges, mens dette er slået til. Intet gemmes på tv’et: slås det fra, er markøren tilbage med det samme.',
    'Choose how the home screen looks: colours, the size of tiles and text, the number of columns, the clock, the ambient glow, animation speed and a wallpaper. Themes are small data files bundled with the package; the accent colour can be changed on top of any of them.':
      'Vælg, hvordan startskærmen ser ud: farver, størrelsen på fliser og tekst, antal kolonner, uret, baggrundsskæret, animationshastighed og et baggrundsbillede. Temaer er små datafiler i pakken; accentfarven kan ændres oven på dem alle.',
    'More choices for the theme: the accent colour, and going back to the previous theme.':
      'Flere valg til temaet: accentfarven og at gå tilbage til det forrige tema.',
    'The colour of the focus ring and of the highlighted button or menu row. “Theme default” uses the theme’s own colour.':
      'Farven på fokusrammen og på den fremhævede knap eller menurække. “Temaets standard” bruger temaets egen farve.',
    'Lets other devices on your network send picture notifications to this TV with a POST request and a secret token. Off by default.':
      'Lader andre enheder på dit netværk sende notifikationer med billeder til dette tv med en POST-forespørgsel og en hemmelig token. Slået fra som standard.',
    'On: the TV listens on port 8767 for POST /notify with the token. Anyone who has the token and network access can show cards on this screen.':
      'Til: tv’et lytter på port 8767 efter POST /notify med token. Alle med token og adgang til netværket kan vise kort på denne skærm.',
    'Shows the address, the token and an example request.': 'Viser adressen, token og en eksempel-forespørgsel.',
    'Shows a QR code. A phone that scans it opens a page, served by the TV for ten minutes, that shows the notification address and the token with Copy buttons (for Home Assistant, for example). The token is a secret.':
      'Viser en QR-kode. En telefon, der scanner den, åbner en side fra tv’et i ti minutter med adressen og token til notifikationer og Copy-knapper (til Home Assistant, for eksempel). Token er hemmelig.',
    'Creates a new secret token. Devices using the old one stop working.':
      'Laver en ny hemmelig token. Enheder, der bruger den gamle, holder op med at virke.',
    'Optional. Speak into the remote and the TV turns it into text on the TV itself (Moonshine, English). The text can be sent to a server you run. Audio never leaves the TV. Needs a download of about 80 MB.':
      'Valgfrit. Tal ind i fjernbetjeningen, og tv’et gør det til tekst på selve tv’et (Moonshine, kun engelsk). Teksten kan sendes til en server, du selv kører. Lyden forlader aldrig tv’et. Kræver en download på cirka 80 MB.',
    'Downloads the speech engine, a 64-bit C library and the model (checksums are verified), then tests them. About a minute. Nothing is installed in the system folders.':
      'Henter talemotoren, et 64-bit C-bibliotek og modellen (kontrolsummer tjekkes) og tester dem. Cirka et minut. Intet installeres i systemmapperne.',
    'On: pressing the button you learned starts listening. A card shows what was heard.':
      'Til: et tryk på den knap, du har lært, starter lytningen. Et kort viser, hvad der blev hørt.',
    'On: what you say is also sent as text to a language model through OpenRouter and the answer is shown on screen. Needs your OpenRouter key; the text goes to OpenRouter and the model provider, never audio.':
      'Til: det, du siger, sendes også som tekst til en sprogmodel via OpenRouter, og svaret vises på skærmen. Kræver din OpenRouter-nøgle; teksten sendes til OpenRouter og modellens udbyder, aldrig lyd.',
    'Shows a QR code. Scan it with a phone on the same Wi-Fi to enter your OpenRouter key, choose a model, write instructions and set a server address. Nothing is typed on the TV.':
      'Viser en QR-kode. Scan den med en telefon på samme wi-fi for at indtaste din OpenRouter-nøgle, vælge en model, skrive instruktioner og sætte en serveradresse. Du skriver intet på tv’et.',
    'Choose the model that answers. The list is read from OpenRouter: the newest models of the main providers, with the price per million words in. The phone page lists every model.':
      'Vælg den model, der svarer. Listen hentes fra OpenRouter: de nyeste modeller fra de største udbydere med prisen pr. million ord ind. Siden på telefonen viser alle modeller.',
    'Shows the commands to set the key, model and instructions from a shell, and how to ask by text.':
      'Viser kommandoerne til at sætte nøgle, model og instruktioner fra en shell, og hvordan du spørger med tekst.',
    'The AI and Home Assistant remember the last turns for ten minutes. This clears them.':
      'AI’en og Home Assistant husker de seneste replikker i ti minutter. Dette sletter dem.',
    'Sends what you say as text to Home Assistant’s Assist and shows its answer. Needs the address and a long-lived access token (Home Assistant profile page), entered on your phone. Choosing this row tests the connection.':
      'Sender det, du siger, som tekst til Home Assistants Assist og viser svaret. Kræver adressen og en langtidsgyldig adgangstoken (Home Assistants profilside), indtastet på din telefon. Vælger du denne række, testes forbindelsen.',
    'Home Assistant first, then the AI: Assist gets the text; if it does not understand, the AI answers. Home Assistant only: never the AI. The AI only: Home Assistant is not asked. Choose to switch.':
      'Home Assistant først, så AI’en: Assist får teksten; forstår den det ikke, svarer AI’en. Kun Home Assistant: aldrig AI’en. Kun AI’en: Home Assistant bliver ikke spurgt. Vælg for at skifte.',
    'Which Home Assistant conversation agent answers. The default is the built-in one; others (for example a language-model agent) are listed from your Home Assistant.':
      'Hvilken samtaleagent i Home Assistant der svarer. Standard er den indbyggede; andre (for eksempel en sprogmodel-agent) hentes fra din Home Assistant.',
    'LG’s own assistant reacts to the same button and sends the audio to LG. On: it is paused while voice is on. A reboot or switching this off undoes it.':
      'LG’s egen assistent reagerer på den samme knap og sender lyden til LG. Til: den er sat på pause, mens stemme er slået til. En genstart, eller at slå dette fra, fortryder det.',
    'Records the code of the remote button that starts listening. Try the microphone button first; any spare button works.':
      'Gemmer koden for den knap på fjernbetjeningen, der starter lytningen. Prøv mikrofonknappen først; enhver ledig knap virker.',
    'Starts listening without the button: speak when the card appears.': 'Starter lytningen uden knappen: tal, når kortet vises.',
    'Where the recognised text goes. Shows how to set the address of your server. Without one, the text is only shown on screen.':
      'Hvor den genkendte tekst sendes hen. Viser, hvordan du sætter adressen på din server. Uden en server vises teksten kun på skærmen.',
    'Deletes the downloaded engine and model. The rest of CleanYourTV is not affected.':
      'Sletter den hentede motor og model. Resten af CleanYourTV påvirkes ikke.',
    'The remote’s Input button opens our Inputs list over the running app instead of LG’s picker. Open this screen to switch it off or to learn the button.':
      'Fjernbetjeningens Input-knap åbner vores liste over indgange over den åbne app i stedet for LG’s liste. Åbn denne skærm for at slå det fra eller lære knappen.',
    'Shows a QR code. Scan it with a phone on the same Wi-Fi to copy a report for a bug report. Addresses and URL paths are masked; the page closes after ten minutes.':
      'Viser en QR-kode. Scan den med en telefon på samme wi-fi for at kopiere en rapport til en fejlmelding. Adresser og URL-stier er skjult; siden lukker efter ti minutter.',
    'Removes the apps, the boot scripts and your settings, then restarts the TV so LG’s Home comes back.':
      'Fjerner apps, opstartsscripts og dine indstillinger og genstarter tv’et, så LG’s startskærm kommer tilbage.',
    'On: pressing Input shows our Inputs list. Off: LG’s picker comes back at once.':
      'Til: et tryk på Input viser vores liste over indgange. Fra: LG’s liste kommer straks tilbage.',
    'Reads the code of your remote’s Input button from the hook, then tests that our list opens. The default is 241. Clear goes back to it.':
      'Læser koden for fjernbetjeningens Input-knap fra krogen og tester, at vores liste åbner. Standard er 241. Ryd går tilbage til den.',
    'Settings for Live TV: switch it on or off, set up or remove your playlist, refresh the guide and learn the Guide key.':
      'Indstillinger for Live-tv: slå det til eller fra, sæt din playliste op eller fjern den, opdater programguiden, og lær Guide-knappen.',
    'On: the launcher has a Live TV button and tile, the Inputs list has Live TV, and the Guide key can open the channel guide. Off: all of that is hidden and LG’s own player and guide are used. Your playlist is kept.':
      'Til: startskærmen har en Live-tv-knap og -flise, listen over indgange har Live-tv, og Guide-knappen kan åbne programguiden. Fra: alt det skjules, og LG’s egen afspiller og guide bruges. Din playliste bevares.',
    'Your M3U playlist and its XMLTV guide. Choose it to set up: a QR code opens a page on your phone where you enter the playlist address and the 6-digit code shown here.':
      'Din M3U-playliste og dens XMLTV-programguide. Vælg den for at sætte op: en QR-kode åbner en side på din telefon, hvor du indtaster adressen på playlisten og den 6-cifrede kode, der vises her.',
    'Downloads the playlist and the programme guide again now. It also happens twice a day.':
      'Henter playlisten og programguiden igen nu. Det sker også to gange om dagen.',
    'Empties the Recent tab and the list of channels that failed. Favourites stay.':
      'Tømmer fanen Seneste og listen over kanaler, der fejlede. Favoritter bliver.',
    'Deletes the playlist address, the channel list, the guide and your favourites from the TV.':
      'Sletter adressen på playlisten, kanallisten, programguiden og dine favoritter fra tv’et.',
    'Deletes the playlist and everything stored for it on the TV. You can set it up again.':
      'Sletter playlisten og alt, der er gemt til den på tv’et. Du kan sætte den op igen.',
    'Records the Guide button’s code. Afterwards it opens the Live TV channel guide over whatever is running (only while Live TV is on). Clear it to get LG’s guide back.':
      'Gemmer koden for Guide-knappen. Derefter åbner den Live-tv’s programguide over det, der kører (kun mens Live-tv er slået til). Ryd den for at få LG’s guide tilbage.',
    'How the Input button shows the Inputs. Over the running app, ready in the background: instant, tested on webOS 25. Over the running app, started when pressed: nothing runs hidden, so it cannot keep the remote; the default on older webOS, where the background one showed a loading circle. The launcher’s Inputs list: the TV goes to our Home (needs CleanYourTV as Home; otherwise the key stays with LG). Choose to go to the next one.':
      'Hvordan Input-knappen viser indgangene. Over den åbne app, klar i baggrunden: straks, testet på webOS 25. Over den åbne app, startes ved tryk: intet kører skjult, så den kan ikke holde på fjernbetjeningen; standard på ældre webOS, hvor den i baggrunden viste en indlæsningscirkel. Startskærmens liste over indgange: tv’et går til vores startskærm (kræver CleanYourTV som startskærm; ellers bliver knappen hos LG). Vælg for at gå til den næste.',
    'Optional. Records the Home button’s code. Afterwards the Home key also closes Live TV and Films & Series (while CleanYourTV is Home). Clear it to give the key back to LG.':
      'Valgfrit. Gemmer koden for Hjem-knappen. Derefter lukker Hjem-knappen også Live-tv og Film og serier (mens CleanYourTV er startskærmen). Ryd den for at give knappen tilbage til LG.',
    'Back to the main list.': 'Tilbage til hovedlisten.',
    'Nothing changes.': 'Intet ændres.',
    'Deletes the apps, the boot scripts and the settings, then restarts the TV.':
      'Sletter apps, opstartsscripts og indstillinger og genstarter tv’et.',
    'Restarts the TV; this launcher is Home after it starts.': 'Genstarter tv’et; denne startskærm er i brug, når det er startet.',
    'Restarts the TV; LG’s own Home is Home after it starts. You can switch back here.':
      'Genstarter tv’et; LG’s egen startskærm er i brug, når det er startet. Du kan skifte tilbage her.',
    'A newer package is available. Install it before the setup: it may contain fixes for your firmware.':
      'En nyere pakke er klar. Installer den før opsætningen: den kan indeholde rettelser til din firmware.',
    'The remote’s Input button opens our Inputs list instead of LG’s picker. You can change this later.':
      'Fjernbetjeningens Input-knap åbner vores liste over indgange i stedet for LG’s liste. Du kan ændre det senere.',
    'Installs the launcher, replaces LG’s Home at boot and starts the service. About a minute; the screen blinks once. If the new Home does not come up, the setup removes itself and restarts the TV.':
      'Installerer startskærmen, erstatter LG’s startskærm ved opstart og starter tjenesten. Cirka et minut; skærmen blinker én gang. Kommer den nye startskærm ikke frem, fjerner opsætningen sig selv og genstarter tv’et.',
    'Your firmware is not in the compatibility list and LG’s Home looks different. This tries it anyway; a failed start restarts the TV with LG’s Home.':
      'Din firmware er ikke på listen over kompatible versioner, og LG’s startskærm ser anderledes ud. Dette prøver alligevel; en mislykket start genstarter tv’et med LG’s startskærm.',
    'Works without the service: looks for a newer package and installs it through the root service.':
      'Virker uden tjenesten: leder efter en nyere pakke og installerer den via root-tjenesten.',
    'This TV also has LG’s full-screen Home: if the Home button opens that instead of this launcher, set TV Settings > General > Home Settings > Home Style to Basic.':
      'Dette tv har også LG’s fuldskærms-startskærm: hvis Hjem-knappen åbner den i stedet for denne startskærm, så sæt Indstillinger > Generelt > Indstillinger for startskærm > Startskærmstil til Basis.',
  },
};
function t(k) {
  var d = TX[LANG];
  return (d && d[k]) || k;
}
/* a message from the service, shown as it came: a fixed text, or one with versions and numbers in it ('Installing launcher 1.6.0'
   is looked up as 'Installing launcher %s'). An unknown message stays English. */
function tm(m) {
  var s = String(m || ''),
    d = TX[LANG],
    v = [];
  if (!d || !s || d[s]) return t(s);
  var k = s.replace(/\d[\w\-]*(?:\.[\w\-]+)*/g, function (x) {
    v.push(x);
    return '%s';
  });
  if (!d[k]) return s;
  return d[k].replace(/%s/g, function () {
    return v.shift();
  });
}
