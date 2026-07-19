#!/usr/bin/env bash
# Fetch every shot on TPC Sawgrass 17 for a PLAYERS year from the public
# pgatour.com GraphQL API (AppSync key ships in the site's own JS bundle).
# scatterData window: 2024+ only. Usage: ./fetch-shots.sh R2025011 > raw.json
# Fetch ONCE and commit the transformed output -- do not hit this live.
TOURNAMENT="${1:-R2025011}"
curl -s https://orchestrator.pgatour.com/graphql \
  -H 'content-type: application/json' \
  -H 'x-api-key: da2-gsrx5bibzbb4njvhl7t37wqyl4' \
  --data-binary "$(cat << EOF
{"query":"query ScatterData(\$tournamentId: ID!, \$course: Int!, \$hole: Int!) { scatterData(tournamentId: \$tournamentId, course: \$course, hole: \$hole) { tournamentId courseId hole holePickle { greenBottomToTop bottomToTop } rounds { display num pinCoords { green { portraitCoords { x y tourcastX tourcastY tourcastZ } } overview { portraitCoords { x y tourcastX tourcastY tourcastZ } } } strokes { strokeNumber playerShots { result player { id name } shotCoords { green { portraitCoords { x y tourcastX tourcastY tourcastZ } } overview { portraitCoords { x y tourcastX tourcastY tourcastZ } } } } } } } }","variables":{"tournamentId":"$TOURNAMENT","course":11,"hole":17}}
EOF
)"
