#!/bin/bash

# Author: azazelm3dj3d (https://github.com/azazelm3dj3d)
# License: GPL-v3
# Stellata (c) 2023

# Path to the tracker and builds
TRACKER="src/stellata.ts"
TRACKER_BUILD="src/_build/stellata.js"
TRACKER_MIN="src/_build/stellata-min.js"

# Build command for the tracker
BUILD=$(tsc $TRACKER --outDir 'src/_build')

# Minify the output
MINIFY=$(uglifyjs $TRACKER_BUILD --output $TRACKER_MIN)

if [ -f $TRACKER ]; then
    # Verifies the 'tsc' command is available in the PATH
    if [ $(command -v 'tsc') ]; then
        $BUILD &> /dev/null

        if [ -f $TRACKER_BUILD ]; then
            echo "Compiled version: '$TRACKER_BUILD'"
        fi

        if [ -f $TRACKER_MIN ]; then
            echo "Minified version: '$TRACKER_MIN'"
        fi

    else
        echo "Missing tsc and uglify-js. Would you like to install them?"
        read $install_pkg

        if [[ $install_pkg == 'y' || $install_pkg == 'yes' ]]; then
            # Installs TypeScript utilities (including 'tsc')
            npm install -g typescript

            # Installs minifier tool
            npm install uglify-js -g

            echo "Please re-run the script build tracker"
        else
            echo "Exiting build"
        fi
    fi
else
    echo "Unable to build tracker"
fi
