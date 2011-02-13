About
====

Node-filesync is a file synchronization system where the client keeps a log of which files are up to date and pushes modifications to the server when updates are made.  Both client and server run on NodeJS.


Client
====

The client communicates with the server through a websocket and pulls updates from the server when necessary.  The client watches for updates through a combination of inotify (or similar services) and periodic recursive checks on watched directories.  File changes are managed with a client-side database.  When a file is updated, the database is updated when the data is pushed to the server.

Server
====

The server communicates changes through open websockets with clients.  When a file is updated, a notification is sent to each listener (to each of the owner's other computers).  The listeners then send a request to download the file.

The server stores information associated with the file and stores a hash of the timestamp, file size, and filepath (path on the server).  The file is then stored on the server at the path specified.  The path is determined by taking 2 character chunks of the hash that was computed.
