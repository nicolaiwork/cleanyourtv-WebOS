# The Input key

The remote's **Input** button opens an Inputs picker over the running app.

![Inputs picker on the Input key](screenshots/picker.jpg)

The picker shows the dock apps in a row, the inputs below (each with its port and what is connected, and a green dot on the
active one) and, when [Live TV](live-tv.md) is on, **Live TV**. A device's name wraps onto a second line, with an ellipsis at
the end of that line when it is longer still, so a long name (HDMI-CEC ones can be) never runs over the cards beside it.

| Key | Action |
|---|---|
| Left / Right | Move |
| Up / Down | Switch rows |
| OK | Open |
| Hold OK on an HDMI input | Put it on Home as a tile, or take it off again ([An input on Home](launcher.md#an-input-on-home)) |
| Back or Input | Close |

The pointer works too.

## What the key shows

The Input button can show the Inputs list in three ways. **Input key** > **Input key shows** in the manager app chooses; each press of
that row goes to the next one.

| Choice | What happens | Default |
|---|---|---|
| Over the running app, ready in the background | A small app, `com.cleanyourtv.picker`, is started hidden after boot and the key only wakes it: instant. | webOS 25 (SDK 10) |
| Over the running app, started when pressed | The same app is started by the key and closes itself after use (Back, a choice, or ten idle seconds). Nothing runs hidden, so it cannot keep the remote. The first moment takes longer. | every other webOS version (5, 6, and 26 until the background app has been tried there) |
| The launcher's Inputs list | The TV goes to Home with the Inputs list open. Needs CleanYourTV as Home; when LG's Home is selected the key stays with LG. | none |

On webOS 6.5 (reports) the hidden background app kept the remote and showed a loading circle, which is why older webOS starts it on
demand. The background app is only kept while the hook attached: without the hook the key cannot open it. If the TV closes the background app three times in ten minutes, the service switches to *started when pressed* by itself
(`picker.mode: ondemand` in `config.json`). Other overlay projects for rooted TVs also start their overlay on demand and close it after
use.

## How it works

It uses the bundled [inputhook](credits.md#inputhook) library, which injects a small hook into LG's input process so that a remote
button can run a command. The Input button's code is **241** by default. The command opens the picker app
(`com.cleanyourtv.picker`) over whatever is on screen.

The hook goes into `lginput2`, LG's input service, where the remote's keys arrive on webOS 5 and newer. Other processes
(`micomservice` and a few more) are only used on firmware without `lginput2`: hooked into `micomservice`, the hook replaced a
function that process also uses to pass the remote's keys on to HDMI-CEC devices and the soundbar, and after a boot the remote no
longer controlled a set-top box and eARC stopped working (issue 23).

## Learning your remote's code

Remotes differ. In the manager app, **Input key** > **Learn the Input key** reads the code of the button you press and tests that
the picker opens. **Clear** restores the default.

The switch in the same menu removes the bind and gives the button back to LG's own picker. **Learn the Home key** is optional.

## The Home key

Live TV and Films & Series run inside the launcher page, so to the TV, Home is already in front while you watch. LG's handling of
the Home button does nothing then: it only launches Home when another app is in front. Once **Learn the Home key** has recorded
the button's code, the hook binds it to `homekey.sh`, which asks the app manager to launch Home, as the TV does from any other
app. With Home in front, the launch reaches the page as a relaunch: Live TV and Films & Series close (a film's position is saved)
and the focus goes back to Play. The bind is only there while CleanYourTV is Home; **Clear** removes it and gives the button back
to LG.

The Guide button can be bound the same way; that is part of [Live TV](live-tv.md#the-guide-button) (manager app > **Live TV** > **Learn the Guide key**).

## The remote's other buttons

Many LG remotes have buttons for streaming services: Netflix, Prime Video, Disney+, Rakuten TV, LG Channels, Alexa and others,
depending on the country. Manager app > **Remote buttons** > **Learn a button** records the code of the next button you press
and names it after LG's name for it. That press still does what LG made it do; when it opens LG's app over the manager, the
service closes that app and brings the manager back on the button's screen. A learned button keeps doing what LG made it do until
you choose something else for it:

| Choice | What the button does |
|---|---|
| LG's own | What LG made it do, such as opening its streaming app |
| Nothing | Nothing; LG's app no longer opens |
| Live TV | Opens Live TV (while Live TV is on and CleanYourTV is Home) |
| Live TV guide | Opens the channel guide over whatever is running, as the [Guide button](live-tv.md#the-guide-button) does (same conditions) |
| Films & Series | Opens [Films & Series](vod.md) (while CleanYourTV is Home) |
| Inputs list | Shows the Inputs list, as the Input key does |
| Voice | Starts listening, as the [voice button](voice.md) does (while voice is installed and on) |
| An app or input | Opens the app or the HDMI input you choose |

The hook binds the button to `buttonkey.sh` with the choice, so LG's own action does not happen. While a choice cannot run (Live
TV off, LG's Home chosen, voice off), the button does what LG made it do, and the row says **not now: LG's own**. A learned key
(Input, Home, Guide, voice) on the same button comes first. **Forget this button** removes it from the list and gives it back to
LG. Tested on webOS 26 (an LG C5 with the MR25GA remote): all six of its streaming buttons reach the hook.

!!! note "When the hook is not attached"
    On some firmware the hook cannot attach. The manager then shows the Input key as not available and LG's picker is used.

## The pointer

LG shows the Magic Remote pointer whenever the remote moves, and on every press of the Home button. To use the remote with
the buttons only, switch on manager app > **Hide the Magic Remote pointer** (off by default). The pointer then never appears;
the buttons, the Input key and a learned Home key work as before. Apps that can only be used with the pointer, such as the web
browser, cannot be used while it is on.

LG's input service (`lginput2`) shows the pointer by sending the screen its own "cursor on" key, taken from a small table in
the program. With the option on, the service writes the "cursor off" key over that one entry in the running process, through
`/proc/<pid>/mem`. Nothing on disk changes. LG restarts its input service now and then, and a restart undoes the change, so
the service checks every 10 seconds and writes it again. Switching the option off puts the entry back at once.

On firmware where the table is not found, or holds something else, nothing is written and the row says
**not possible on this TV**. Tested on webOS 26 (an LG C5).
