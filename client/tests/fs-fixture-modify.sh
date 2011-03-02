#!/bin/bash
T=./testdir

# Notes:
# `mv` is like `cp -a`. It will preserve mtime and atime, but not ctime

# You can only do these operations to a file
# * create
#   * create + modify -> create
#   * create + remove -> nil
#   * create + duplicate == create + duplicate
# * duplicate
# * move / rename
#   * move & modify -> create
# * modify
# * unlink

# One case that will be handled particularly poorly
# is that if a file is both moved and modified, it
# will be considered another version of the file
# I don't know how to go about comparing it to
# its deleted counterpart... maybe some sort of
# similarity hash

function create_files {
  echo "oh cruel world" > ${T}/cruel.txt
}

function duplicate_files {
  cp ${T}/dupme.bin ${T}/gotdupped.bin
  cp ${T}/cruel.txt ${T}/cruel2.txt
}

function modify_file {
  dd if=/dev/random of=${T}/modme.bin bs=231 count=13
}

function move_file {
  mv ${T}/moveme.bin ${T}/gotmoved.bin
}

function delete_file {
  rm ${T}/deleteme.bin
}


function modify_base {
  create_files
  duplicate_files
  modify_file
  move_file
  delete_file
}

modify_base
