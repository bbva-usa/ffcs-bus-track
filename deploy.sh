#!/bin/bash

rm -Rf dist
yarn install
yarn run webpack -p
cp app.css dist/
cp index.html dist/
aws s3 cp dist s3://team3-bus-app-v2 --recursive
