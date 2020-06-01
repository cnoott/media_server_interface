# Media_Sever_Interface

Uses an interface served on a webserver, scrapes a torrenting site based on a search query and executes commands with Transmission-remote-cli to download the torrent. 

## Dependencies

* transmission-remote-cli (for downloading torrent)
* Rest of dependencies are in the package-lock.json


## Installation

After installing transmission-remote-cli clone the repo:

```bash
git clone https://github.com/cnoott/media_server_interface.git
```
Change directory into folder
```bash
cd media_server_interface
```

Install node dependencies:
```bash
npm --install
```
## Usage
```bash
node server.js
```

## Todo
1. Use a torrenting api so that transmission-remote-cli doesnt have to be used.


