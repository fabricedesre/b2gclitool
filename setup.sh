#!/bin/bash

set -x -e 

adb forward tcp:6000 localfilesystem:/data/local/debugger-socket
