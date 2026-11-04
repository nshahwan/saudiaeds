#!/usr/bin/env bash
# Register (and optionally publish) the GraphQL persisted queries of tools/aem-packages/graphql/
# on the AEM author (configuration `saudiaeds`): saudiaeds/booking-engine-by-path (blocks/booking)
# and saudiaeds/story-by-path (blocks/stories). Then check them on publish the way the site calls
# them (the site shows "Could not find Persisted Query" until they are persisted AND published).
#
# Run it yourself, from your own terminal, with your own credentials:
#   AEM_TOKEN=<developer console access token> tools/aem-packages/persist-queries.sh
#   (or AEM_USER=<user> AEM_PASSWORD=<password> on a local SDK)
# Options:
#   PUBLISH=1     also publish (activate) each persisted query; otherwise publish them in
#                 Tools › General › GraphQL Query Editor › saudiaeds › <query> › Publish
#   AEM_AUTHOR    default: this site's author
#   AEM_PUBLISH   default: this site's publish (used for the final check)
#   ORIGIN        site origin sent with the check (CORS), default the main preview
set -euo pipefail
AUTHOR=${AEM_AUTHOR:-https://author-p208666-e2180259.adobeaemcloud.com}
PUBLISH_HOST=${AEM_PUBLISH:-https://publish-p208666-e2180259.adobeaemcloud.com}
ORIGIN=${ORIGIN:-https://main--saudiaeds--nshahwan.aem.page}
NAMESPACE=saudiaeds
DIR=$(cd "$(dirname "$0")/graphql" && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
if [ -n "${AEM_TOKEN:-}" ]; then AUTH=(-H "Authorization: Bearer ${AEM_TOKEN}");
elif [ -n "${AEM_USER:-}" ]; then AUTH=(-u "${AEM_USER}:${AEM_PASSWORD:-}");
else echo "set AEM_TOKEN (or AEM_USER / AEM_PASSWORD)" >&2; exit 2; fi

# the documented request body: {"query": "<the .graphql file>"} (raw query if python3 is missing)
body() {
  if command -v python3 >/dev/null; then
    python3 -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1], encoding="utf-8").read()}))' "$1" \
      > "$TMP/body.json"
    echo "application/json $TMP/body.json"
  else
    echo "application/graphql $1"
  fi
}

# sample fragment per query for the publish check
sample() {
  case "$1" in
    booking-engine-by-path) echo /content/dam/saudiaeds/fragments/booking-engine/home ;;
    story-by-path) echo /content/dam/saudiaeds/fragments/stories/skytrax-2026-top-15-airlines ;;
  esac
}

status=0
for f in "$DIR"/*.graphql; do
  name=$(basename "$f" .graphql)
  read -r type file < <(body "$f")
  url="$AUTHOR/graphql/persist.json/$NAMESPACE/$name"
  code=$(curl -s -o "$TMP/$name.out" -w '%{http_code}' -X PUT "${AUTH[@]}" \
    -H "Content-Type: $type" --data-binary @"$file" "$url")
  if [ "$code" = 409 ]; then # already persisted: update it
    code=$(curl -s -o "$TMP/$name.out" -w '%{http_code}' -X POST "${AUTH[@]}" \
      -H "Content-Type: $type" --data-binary @"$file" "$url")
  fi
  echo "persist $name: HTTP $code $(head -c 300 "$TMP/$name.out")"
  case "$code" in 2??) ;; *) status=1; continue ;; esac

  if [ "${PUBLISH:-}" = 1 ]; then
    code=$(curl -s -o "$TMP/$name.pub" -w '%{http_code}' -X POST "${AUTH[@]}" \
      -F cmd=Activate -F "path=/conf/$NAMESPACE/settings/graphql/persistentQueries/$name" \
      "$AUTHOR/bin/replicate.json")
    echo "publish $name: HTTP $code $(head -c 200 "$TMP/$name.pub")"
    case "$code" in 2??) ;; *) status=1; echo "  → publish it in the GraphQL Query Editor instead" ;; esac
  fi
done

# what the site sees: the same request as the blocks (path slashes kept, no credentials)
echo
echo "check on publish ($PUBLISH_HOST, origin $ORIGIN):"
for f in "$DIR"/*.graphql; do
  name=$(basename "$f" .graphql)
  path=$(sample "$name")
  [ -n "$path" ] || continue
  code=$(curl -s -o "$TMP/$name.check" -D "$TMP/$name.headers" -w '%{http_code}' -H "Origin: $ORIGIN" \
    "$PUBLISH_HOST/graphql/execute.json/$NAMESPACE/$name;path=$path;variation=master")
  cors=$(grep -i '^access-control-allow-origin:' "$TMP/$name.headers" | tr -d '\r' | cut -d' ' -f2-)
  if grep -q '"errors"' "$TMP/$name.check"; then
    status=1
    echo "  $name: HTTP $code — $(head -c 300 "$TMP/$name.check")"
  else
    echo "  $name: HTTP $code, data returned; CORS allow-origin: ${cors:-MISSING}"
    [ -n "$cors" ] || status=1
  fi
done
exit $status
