#!/usr/bin/env bash
# Compile and test one exercise.
#   ./run.sh 3              test exercises/ex03_*.c
#   ./run.sh all            test every exercise
#   ./run.sh 3 --solution   test the answer key instead
set -uo pipefail
cd "$(dirname "$0")"

CC="${CC:-gcc}"
CFLAGS="-std=c11 -Wall -Wextra -Wpedantic -g"
folder="exercises"
[[ "${2:-}" == "--solution" ]] && folder="solutions"

if [[ $# -lt 1 ]]; then
    sed -n '2,5p' "$0"
    exit 1
fi

mkdir -p build
run_one() {
    local n src
    n=$(printf "%02d" "$((10#$1))")
    src=$(ls "$folder"/ex"$n"_*.c 2>/dev/null) || { echo "No exercise $1"; return 1; }
    echo
    echo "== $src =="
    $CC $CFLAGS -Iinclude "tests/test$n.c" "$src" -o "build/ex$n" -lm || return 1
    "./build/ex$n"
}

if [[ "$1" == "all" ]]; then
    status=0
    for i in $(seq 1 10); do run_one "$i" || status=1; done
    exit $status
fi
run_one "$1"
