FileSync Client
====

`runner.js` contains the client

The following options are defined up top and are of interest:

    {
      start: './tests',
      host: '192.168.1.29',
      //host: 'localhost', 
      port: 8022,
      user: 'coolaj86',
      password: 'cr4zym0nk3y'
    }

  * `start` - where to begin crawling
  * `host` - the target computer which will receive and catalog the files
  * `port` - the port on the target computer to connect to
  * `user` - the username on the target computer
  * `password` - duh

Process Overview
====

  * Check the database for files waiting to be uploaded
  * Upload any such files
  * Scan for changed files to upload
  * Run it from the top in 15 minutes

Upload Format
====

The upload has three parts:

  * `statsHeader` - an array describing the order of the fields
  * `stats` - the fields describing the files to be uploaded
  * files-by-qmd5 - the files, indexed by their qmd5, which is `md5(path + unix_timestamp + size)`

Parsed Example
----

  {
    'statsHeader': ["path","mtime","size","qmd5"],
    'stats': [
      ["./test/file1.txt", 1301550628582, 329616, "1e09da930b7ccf6da44c9e51a36db61c"],
      ["./test/file2.txt", 1301549428151, 683246, "52b0eac13ec224f8fc71076734de1fba"],
    ],
    "1e09da930b7ccf6da44c9e51a36db61c": [Object File],
    "52b0eac13ec224f8fc71076734de1fba": [Object File]
  }


HTTP Example
----

TODO wireshark a real example exactly as it is.

Note: this is fairly similar, but not exactly what a request will look like

Adapted from: https://github.com/coolaj86/http-examples/raw/master/multipart-form/3-post-multiple-inputs.http.raw

    POST / HTTP/1.1
    Host: 192.168.1.29:8022
    User-Agent: Node.JS (AHR)
    Accept: application/json;q=0.9,*/*;q=0.8
    Accept-Language: en-us,en;q=0.5
    Accept-Encoding: gzip,deflate
    Accept-Charset: ISO-8859-1,utf-8;q=0.7,*;q=0.7
    Keep-Alive: 115
    Connection: keep-alive
    Content-Type: multipart/form-data; boundary=---------------------------114772229410704779042051621609
    Transfer-Encoding: chunked

    4b13

    -----------------------------114772229410704779042051621609
    Content-Disposition: form-data; name="statsHeader"

    ["path","mtime","size","qmd5"]
    -----------------------------114772229410704779042051621609
    Content-Disposition: form-data; name="stats"

    [
      ["./test/file1.txt", 1301550628582, 329616, "1e09da930b7ccf6da44c9e51a36db61c"],
      ["./test/file2.txt", 1301549428151, 683246, "52b0eac13ec224f8fc71076734de1fba"],
    ]
    -----------------------------114772229410704779042051621609
    Content-Disposition: form-data; name="1e09da930b7ccf6da44c9e51a36db61c"; filename="file1.txt"
    Content-Type: text/plain

    This is file 2
    It has three lines
    And was created on OS X

    -----------------------------114772229410704779042051621609
    Content-Disposition: form-data; name="52b0eac13ec224f8fc71076734de1fba"; filename="file2.txt"
    Content-Type: text/plain

    This is not the actual size of the file. It has a trailing newline, as do most.

    -----------------------------114772229410704779042051621609--
    0
