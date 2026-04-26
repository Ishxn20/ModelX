#!/bin/bash

set -e

cd "$(dirname "$0")"
export PYTHONPATH="$PWD/backend"
python test_end_to_end.py
