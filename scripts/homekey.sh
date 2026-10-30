#!/bin/sh
# Run by the inputhook when the Home button is pressed (a Home key was learned and CleanYourTV is Home). The app manager does what the
# Home key does, and while Home is already in front (Live TV, Films & Series) the launch reaches the page as a relaunch, which closes
# them: LG's own handling of the key does not relaunch Home that is in front.
export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
luna-send -n 1 -w 3000 luna://com.webos.applicationManager/launch '{"id":"com.webos.app.home"}' </dev/null >/dev/null 2>&1
