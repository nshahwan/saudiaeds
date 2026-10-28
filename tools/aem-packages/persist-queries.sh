#!/usr/bin/env bash
# Register the GraphQL persisted queries of tools/aem-packages/graphql/ on the AEM author
# (config `saudiaeds`): saudiaeds/booking-engine-by-path (blocks/booking) and
# saudiaeds/story-by-path (blocks/stories).
#
# Run it yourself, from your own terminal, with your own credentials:
#   AEM_TOKEN=<developer console access token> tools/aem-packages/persist-queries.sh
#   (or AEM_USER=<user> AEM_PASSWORD=<password> on a local SDK)
# Optional: AEM_AUTHOR (default: this site's author). Publish the queries afterwards
# (Tools › GraphQL Query Editor › saudiaeds › Publish) so the site can call them.
set -euo pipefail
AUTHOR=${AEM_AUTHOR:-https://author-p208666-e2180259.adobeaemcloud.com}
DIR=$(cd "$(dirname "$0")/graphql" && pwd)
if [ -n "${AEM_TOKEN:-}" ]; then AUTH=(-H "Authorization: Bearer ${AEM_TOKEN}");
elif [ -n "${AEM_USER:-}" ]; then AUTH=(-u "${AEM_USER}:${AEM_PASSWORD:-}");
else echo "set AEM_TOKEN (or AEM_USER / AEM_PASSWORD)" >&2; exit 2; fi

for f in "$DIR"/*.graphql; do
  name=$(basename "$f" .graphql)
  code=$(curl -s -o /tmp/persist-"$name".out -w '%{http_code}' -X PUT "${AUTH[@]}" \
    -H 'Content-Type: application/graphql' --data-binary @"$f" \
    "$AUTHOR/graphql/persist.json/saudiaeds/$name")
  if [ "$code" = 409 ]; then # already persisted: update it
    code=$(curl -s -o /tmp/persist-"$name".out -w '%{http_code}' -X POST "${AUTH[@]}" \
      -H 'Content-Type: application/graphql' --data-binary @"$f" \
      "$AUTHOR/graphql/persist.json/saudiaeds/$name")
  fi
  echo "$name: HTTP $code $(head -c 200 /tmp/persist-"$name".out)"
done
