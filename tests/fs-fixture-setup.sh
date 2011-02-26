#!/bin/bash
T=./testdir
mkdir -p ${T}

rm ${T}/*

function create_base {
  echo "hello world" > ${T}/hello.txt
  dd if=/dev/zero of=${T}/dupme.bin bs=1024 count=12
  dd if=/dev/urandom of=${T}/modme.bin bs=767 count=9
  dd if=/dev/random of=${T}/moveme.bin bs=1024 count=9
  dd if=/dev/urandom of=${T}/deleteme.bin bs=767 count=9
  echo "goodbye world" > ${T}/goodbye.txt
}

create_base
