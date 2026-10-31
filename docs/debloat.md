# Debloat

An optional clean-up of LG's ads and telemetry. It is on by default in the setup and has a switch in the
[manager app](manager.md).

## What it does

About a minute after every boot, the debloat:

- **stops** the systemd services `remotelogger`, `service-logger`, `contentminer` and `nudge`;
- **prevents** `acr2`, `admanager`, `sportsalarm` and `adoverlay-service` from starting, by mounting a do-nothing stub over each
  program (in RAM; the real files are not changed);
- **adds** `eic.ads.lgtvcommon.com`, `nl.ad.lgsmartad.com` and `nl.info.lgsmartad.com` to `/etc/hosts`, pointing at `127.0.0.1`
  and `::1` and marked `# cleanyourtv-debloat` (other entries are untouched). Where `/etc/hosts` is on the read-only system partition, a copy
  with these lines is kept in RAM (`/tmp/cleanyourtv-hosts`) and mounted over it until the next restart.

Nothing is uninstalled. It applies only while the launcher is Home, because LG's own Home needs some of those services to start;
switching back to LG's Home lifts the debloat first.

## LG Channels

LG's preload manager starts the **LG Channels** app hidden about a minute after every boot and keeps it in memory, whether or not it is
ever opened. The manager app's switch **Stop LG Channels in the background** (on by default, separate from the debloat, and applied
whether or not the launcher is Home) keeps it from starting there:

- it switches LG Channels off in the preload manager's policy (`setPreloadPolicy` with `isEnabled: false` and `permanent: false`: only
  the preload manager's memory changes, never LG's preferences file);
- it closes a copy that is already running in the background (preloaded before the service got there, or left there); LG Channels
  in front, opened on purpose, is left alone;
- it checks again every five minutes, since a restart of the preload manager forgets the change.

LG Channels stays installed and can still be opened. Switching it off gives the preload manager LG's own policy back at once (the app
is not started again until LG's preload manager next decides to); a reboot without the service does the same. On a TV whose preload
manager does not list LG Channels, the manager app shows "not possible on this TV".

## Turning it off

Switch **Debloat** off in the manager app. It starts the stopped services again, unmounts the stubs and removes the marked
hosts lines. To pause it without the manager, create `/media/developer/cleanyourtv/DISABLE-DEBLOAT`.

## What it does not do

It does not block updates: firmware update blocking (for example with the Homebrew Channel's tools) is separate and is not touched.
It does not claim to remove all tracking. It stops the services listed above and nothing else.
