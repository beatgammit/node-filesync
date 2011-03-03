About
=====

Node-filesync is a file synchronization system utilizing NodeJS in both the client and server.


Client
======

The client communicates with the server through a websocket and pulls updates from the server when necessary. The various components are:

* Watched files database
    * Implemented with PostgreSQL
	* Updated on filesystem events (inotify or similar)
	* Used in periodic sync checks
	* Keys are hashes based on the filepath, timestamp and size
	* Values are filepaths
	* Keys are reverse searchable as well
* HTTP client
    * Pushes changed files to the server
	* Pulls changed files from the server
	* Stores files to be uploaded in a priority queue
	* Stores files to be downloaded in a priority queue
	* Opens websocket with server (server notifies all clients of file changes)


Server
======

The server communicates changes through open websockets with clients and serves file upload and download requests. The particur components are as follows:

* File database- implemented with CouchDB
    * Key- md5 hash of file
	* Value- owners, file data, and location of file on server
* Files stored on disk according to md5 sum
    * Directory structure determined by md5 sum
	* Filename is md5 sum
* HTTP server
    * Opens websockets with each client and pushes file change notifications
	* Responds to file download requests
	* Responds to file upload requests
	* Responds to watched file data requests (all files watched)


Supported commands:

* /register- Register a user using either POST or GET request
	* Formatted url query or JSON
	* Must have 'user' and 'pass' field w/ optional data field
* /file- Upload one or more files using formidable on a POST request
	* 'fields' must have 2 properties, 'statsHeader' and 'stats'
	* 'statsHeader' has all of the fields in stats in the same order
	* 'stats' has all of the data for each FileStat object
* /check- Check to see if a file or files are already uploaded
	* POST request only
	* Must be formatted JSON array of one or more FileStat objects (must have tmd5)
	* Returns an array of FileStat objects with a new 'exists' property and possibly an 'err' property
* /meta- Search for Files of a certain type
	* format- /meta/mime/type where mime/type is any mimetype in the database
	* mimetype group search will be supported in the future


State of the project:
=====================

This is a work in progress. This section should give a basic notion of what should work and what has not been implemented yet.

Finished:
---------

* Basic file uploads in node
* Listening to filesystem events given a parent directory usind inotify
* Hashing on server and client
* Directory structure on server
* Server database backend to track uploaded files
* Client database to track file synchronization with server

To Do:
------

* File downloads
* Websocket connection between client and server
* Priority queue on client and basic server support for priority
* Settings manager to add or remove directories to synchronize
* Expand searching for documents

Ideas for expansion:
--------------------

* File blacklist and single file synchronization
* Directory blacklist
* Support for multiple partitions based on UUID or GUID
* Delay synchronization if system is in use
* Custom priority scripts (user defined)
* Support for multiple platforms (Windows, Mac, and possibly smartphones)
* Resume halted uploads/downloads
* Synchronize settings (Windows registry, smartphone settings, etc)
