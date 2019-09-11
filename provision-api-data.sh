#!/bin/bash

BASE_DOMAIN=https://tnnze9frd0.execute-api.us-east-1.amazonaws.com/dev

for file in src/*.json
do
  curl -H "Content-Type: application/json" -X POST ${BASE_DOMAIN}/routes -d @"$file"
done
