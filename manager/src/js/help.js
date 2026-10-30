/* what each row does, shown on the left for the focused row. The keys are the rows' English labels; a row with a variable label
   (a version, a name) names its key in k */
var INFO = {
  'Launcher': t(
    'The home screen you see. Updates come from GitHub releases and are checked against a SHA-256 file before they are installed. If a new launcher does not start, the previous one is put back.'
  ),
  'Service': t(
    'The background service behind the launcher: Live TV, picture notifications, the Input key, these updates. A failed update restores the previous files.'
  ),
  'Check for updates': t('Looks for a newer release on GitHub. Nothing is installed until you choose an update.'),
  'Update channel': t(
    'Stable releases are what most people want. A test build is a change someone asks you to try, built from a branch of the repository; it can be less finished. Choose a test build here, then use the Launcher and Service rows to install it. Going back to Stable offers the latest release again.'
  ),
  'Go back to launcher': t('Swaps the previous launcher version back in. The newer one stays available as an update.'),
  'CleanYourTV as Home': t(
    'On: the Home button opens this launcher. Off: LG\u2019s own Home. Switching restarts the TV (about a minute); the service keeps running either way.'
  ),
  'Debloat LG\u2019s ads and telemetry': t(
    'Stops LG\u2019s ad, recommendation and telemetry services and blocks a few ad servers. Nothing is uninstalled, and it only applies while this launcher is Home.'
  ),
  'Hide the Magic Remote pointer': t(
    'The pointer never appears, not on the Home button and not when the remote moves. The buttons work as before; apps that need the pointer, such as the web browser, cannot be used while this is on. Nothing is stored on the TV: switching off brings the pointer back at once.'
  ),

  'Theme': t(
    'Choose how the home screen looks: colours, the size of tiles and text, the number of columns, the clock, the ambient glow, animation speed and a wallpaper. Themes are small data files bundled with the package; the accent colour can be changed on top of any of them.'
  ),
  'Theme options': t('More choices for the theme: the accent colour, and going back to the previous theme.'),
  'Accent colour': t(
    'The colour of the focus ring and of the highlighted button or menu row. \u201CTheme default\u201D uses the theme\u2019s own colour.'
  ),
  'Network notifications': t(
    'Lets other devices on your network send picture notifications to this TV with a POST request and a secret token. Off by default.'
  ),
  'Accept notifications from the network': t(
    'On: the TV listens on port 8767 for POST /notify with the token. Anyone who has the token and network access can show cards on this screen.'
  ),
  'How to send': t('Shows the address, the token and an example request.'),
  'Show as QR code': t(
    'Shows a QR code. A phone that scans it opens a page, served by the TV for ten minutes, that shows the notification address and the token with Copy buttons (for Home Assistant, for example). The token is a secret.'
  ),
  'New token': t('Creates a new secret token. Devices using the old one stop working.'),
  'Voice': t(
    'Optional. Speak into the remote and the TV turns it into text on the TV itself (Moonshine, English). The text can be sent to a server you run. Audio never leaves the TV. Needs a download of about 80 MB.'
  ),
  'Install voice': t(
    'Downloads the speech engine, a 64-bit C library and the model (checksums are verified), then tests them. About a minute. Nothing is installed in the system folders.'
  ),
  'Listen on the voice button': t('On: pressing the button you learned starts listening. A card shows what was heard.'),
  'AI chat (OpenRouter)': t(
    'On: what you say is also sent as text to a language model through OpenRouter and the answer is shown on screen. Needs your OpenRouter key; the text goes to OpenRouter and the model provider, never audio.'
  ),
  'Set up from your phone': t(
    'Shows a QR code. Scan it with a phone on the same Wi-Fi to enter your OpenRouter key, choose a model, write instructions and set a server address. Nothing is typed on the TV.'
  ),
  'Model': t(
    'Choose the model that answers. The list is read from OpenRouter: the newest models of the main providers, with the price per million words in. The phone page lists every model.'
  ),
  'Set up with commands': t('Shows the commands to set the key, model and instructions from a shell, and how to ask by text.'),
  'Forget the conversation': t('The AI and Home Assistant remember the last turns for ten minutes. This clears them.'),
  'Home Assistant (Assist)': t(
    'Sends what you say as text to Home Assistant\u2019s Assist and shows its answer. Needs the address and a long-lived access token (Home Assistant profile page), entered on your phone. Choosing this row tests the connection.'
  ),
  'Which answers first': t(
    'Home Assistant first, then the AI: Assist gets the text; if it does not understand, the AI answers. Home Assistant only: never the AI. The AI only: Home Assistant is not asked. Choose to switch.'
  ),
  'Assist agent': t(
    'Which Home Assistant conversation agent answers. The default is the built-in one; others (for example a language-model agent) are listed from your Home Assistant.'
  ),
  'Switch off LG\u2019s voice assistant': t(
    'LG\u2019s own assistant reacts to the same button and sends the audio to LG. On: it is paused while voice is on. A reboot or switching this off undoes it.'
  ),
  'Learn the voice button': t(
    'Records the code of the remote button that starts listening. Try the microphone button first; any spare button works.'
  ),
  'Try it now': t('Starts listening without the button: speak when the card appears.'),
  'Send the text to': t(
    'Where the recognised text goes. Shows how to set the address of your server. Without one, the text is only shown on screen.'
  ),
  'Remove voice': t('Deletes the downloaded engine and model. The rest of CleanYourTV is not affected.'),
  'Input key': t(
    'The remote\u2019s Input button opens our Inputs list over the running app instead of LG\u2019s picker. Open this screen to switch it off or to learn the button.'
  ),
  'Share log': t(
    'Shows a QR code. Scan it with a phone on the same Wi-Fi to copy a report for a bug report. Addresses and URL paths are masked; the page closes after ten minutes.'
  ),
  'Uninstall': t('Removes the apps, the boot scripts and your settings, then restarts the TV so LG\u2019s Home comes back.'),
  'Input key opens our Inputs list': t('On: pressing Input shows our Inputs list. Off: LG\u2019s picker comes back at once.'),
  'Learn the Input key': t(
    'Reads the code of your remote\u2019s Input button from the hook, then tests that our list opens. The default is 241. Clear goes back to it.'
  ),
  'Live TV': t('Settings for Live TV: switch it on or off, set up or remove your playlist, refresh the guide and learn the Guide key.'),
  'Show Live TV': t(
    'On: the launcher has a Live TV button and tile, the Inputs list has Live TV, and the Guide key can open the channel guide. Off: all of that is hidden and LG\u2019s own player and guide are used. Your playlist is kept.'
  ),
  'Playlist': t(
    'Your M3U playlist and its XMLTV guide. Choose it to set up: a QR code opens a page on your phone where you enter the playlist address and the 6-digit code shown here.'
  ),
  'Refresh playlist and guide': t('Downloads the playlist and the programme guide again now. It also happens twice a day.'),
  'Clear recent channels': t('Empties the Recent tab and the list of channels that failed. Favourites stay.'),
  'Remove the playlist': t('Deletes the playlist address, the channel list, the guide and your favourites from the TV.'),
  'Yes, remove the playlist': t('Deletes the playlist and everything stored for it on the TV. You can set it up again.'),
  'Learn the Guide key': t(
    'Records the Guide button\u2019s code. Afterwards it opens the Live TV channel guide over whatever is running (only while Live TV is on). Clear it to get LG\u2019s guide back.'
  ),
  'Input key shows': t(
    'How the Input button shows the Inputs. Over the running app, ready in the background: instant, tested on webOS 25. Over the running app, started when pressed: nothing runs hidden, so it cannot keep the remote; the default on older webOS, where the background one showed a loading circle. The launcher\u2019s Inputs list: the TV goes to our Home (needs CleanYourTV as Home; otherwise the key stays with LG). Choose to go to the next one.'
  ),
  'Remote buttons': t(
    'The remote\u2019s other buttons, such as Netflix, Prime Video, Disney+ or Alexa: learn one, then choose what it does instead of opening LG\u2019s app. Live TV, its guide or Films & Series, the Inputs list, voice, or an app or input of your choice.'
  ),
  'Learn a button': t('Records the code of the next button you press. It keeps doing what LG made it do until you choose something else.'),
  'Forget this button': t('The button does what LG made it do again, and leaves this list.'),
  'Learn the Home key': t(
    'Optional. Records the Home button\u2019s code. Afterwards the Home key also closes Live TV and Films & Series (while CleanYourTV is Home). Clear it to give the key back to LG.'
  ),
  'Back': t('Back to the main list.'),
  'Cancel': t('Nothing changes.'),
  'Yes, remove CleanYourTV': t('Deletes the apps, the boot scripts and the settings, then restarts the TV.'),
  'Yes, use CleanYourTV as Home': t('Restarts the TV; this launcher is Home after it starts.'),
  'Yes, use LG\u2019s Home': t('Restarts the TV; LG\u2019s own Home is Home after it starts. You can switch back here.'),
  'Update to': t('A newer package is available. Install it before the setup: it may contain fixes for your firmware.'),
  'Take over the Input key': t(
    'The remote\u2019s Input button opens our Inputs list instead of LG\u2019s picker. You can change this later.'
  ),
  'Set up now': t(
    'Installs the launcher, replaces LG\u2019s Home at boot and starts the service. About a minute; the screen blinks once. If the new Home does not come up, the setup removes itself and restarts the TV.'
  ),
  'Set up anyway': t(
    'Your firmware is not in the compatibility list and LG\u2019s Home looks different. This tries it anyway; a failed start restarts the TV with LG\u2019s Home.'
  ),
};
function infoKey(label) {
  // the label is shown in the TV's language: find the English key it was made from
  if (INFO[label]) return label;
  for (var k in INFO) if (INFO.hasOwnProperty(k) && t(k) === label) return k;
  return '';
}
function infoFor(r) {
  if (!r || r.sep) return null;
  if (r.info) return r.info;
  var k = r.k || infoKey(r.label);
  if (k === 'Check for updates' && offline)
    return { t: t(k), d: t('Works without the service: looks for a newer package and installs it through the root service.') };
  if (k === 'CleanYourTV as Home' && st && st.home && st.home.fullhome)
    return {
      t: t(k),
      d:
        INFO[k] +
        ' ' +
        t(
          'This TV also has LG\u2019s full-screen Home: if the Home button opens that instead of this launcher, set TV Settings > General > Home Settings > Home Style to Basic.'
        ),
    };
  return INFO[k] ? { t: t(k), d: INFO[k] } : null;
}
