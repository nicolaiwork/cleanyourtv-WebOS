#!/bin/sh
# Run by the inputhook when one of the remote's other buttons is pressed (Netflix, Prime Video, ...: learned in the manager's Remote
# buttons, helper/buttons.js). $1 is the action chosen there, $2 the app for "app". "none" only keeps LG's own action from happening.
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
D=/media/developer/cleanyourtv
launch() { luna-send -n 1 -w 3000 luna://com.webos.applicationManager/launch "$1" </dev/null >/dev/null 2>&1; }
case "$1" in
  live) launch '{"id":"com.webos.app.home","params":{"live":true}}' ;;
  guide) launch '{"id":"com.webos.app.home","params":{"live":true,"guide":true}}' ;;
  vod) launch '{"id":"com.webos.app.home","params":{"vod":true}}' ;;
  inputs) exec sh "$D/inputkey.sh" ;;
  voice) exec sh "$D/voicekey.sh" ;;
  app)
    case "$2" in '' | *[!A-Za-z0-9._-]*) exit 1 ;; esac
    launch "{\"id\":\"$2\"}"
    ;;
esac
exit 0
