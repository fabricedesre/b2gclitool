# A command line tool for b2g-based devices

First, forward the remote debugging socket to the tcp port 6000
locally by running `adb forward tcp:6000 localfilesystem:/data/local/debugger-socket`

Then run `npm install` to get the dependencies.

Running `./b2g.js` will list the available commands and their parameters.