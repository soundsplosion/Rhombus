In order for these demos to work reliably, they need to be served, not just accessed via the filesystem (because the sampler loads samples using XMLHttpRequest).
Run one of the following commands from the root of the repository (not the demos folder, if you do that then the build/rhombus.js file can't get served):
$ python -m SimpleHTTPServer
$ python3 -m http.server
